import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' show AppExitResponse, AppExitType;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:weapp_container/weapp_container.dart';

import 'text_dialog.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MaterialApp(
      title: 'Weapp Container',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xff167d66),
        useMaterial3: true,
      ),
      home: const Showcase(),
    ),
  );
}

class Showcase extends StatefulWidget {
  const Showcase({super.key});
  @override
  State<Showcase> createState() => _ShowcaseState();
}

class _ShowcaseState extends State<Showcase> with WidgetsBindingObserver {
  WeappContainerController? _controller;
  StreamSubscription<WeappContainerEvent>? _events;
  Directory? _support;
  String? _guestSession;
  Map<String, dynamic>? _pendingText;
  Object? _savedState;
  String _status = '正在准备演示';
  String? _failure;
  bool _closing = false, _closed = false, _dialogOpen = false;
  bool _loaded = false, _storageFlushed = false;
  Route<String>? _textRoute;
  Future<void> _stateWrite = Future<void>.value();
  Future<void>? _closeOperation;
  Future<void>? _startOperation;
  Timer? _runtimeClose;
  Future<void> _runtimeWrite = Future<void>.value();
  final Map<String, dynamic> _runtime = {
    'schemaVersion': 1,
    'family': 'flutter',
    'pid': pid,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_recordRuntime({'started': true}));
    final closeFile = Platform.environment['SHOWCASE_RUNTIME_CLOSE_FILE'];
    if (closeFile != null && closeFile.isNotEmpty) {
      _runtimeClose = Timer.periodic(const Duration(milliseconds: 100), (
        timer,
      ) {
        if (!File(closeFile).existsSync() || _closing) return;
        timer.cancel();
        unawaited(() async {
          try {
            await _close();
            await ServicesBinding.instance.exitApplication(
              AppExitType.required,
            );
          } catch (error, stack) {
            _fail(error, stack);
          }
        }());
      });
    }
    _startOperation = _start().catchError((Object error, StackTrace stack) {
      if (!_closing && !_closed) _fail(error, stack);
    });
    unawaited(_startOperation!);
  }

  void _fail(Object error, [StackTrace? stack]) {
    if (_closed) return;
    unawaited(_recordRuntime({'error': '$error'}));
    if (mounted) {
      setState(() {
        _failure = '$error';
        _status = _closing ? '保存或关闭失败，请重试' : '演示出现错误';
      });
    }
  }

  Future<void> _start() async {
    final isolated = Platform.environment['SHOWCASE_RUNTIME_SUPPORT'];
    final support = isolated == null || isolated.isEmpty
        ? await getApplicationSupportDirectory()
        : await Directory(isolated).create(recursive: true);
    _support = support;
    final stateFile = File('${support.path}/showcase-state.json');
    if (await stateFile.exists()) {
      try {
        _savedState = jsonDecode(await stateFile.readAsString());
      } on FormatException {
        await stateFile.rename('${stateFile.path}.invalid');
      }
    }
    final files = (jsonDecode(
      await rootBundle.loadString('assets/fixture-index.json'),
    ) as List).cast<String>();
    final manifest = jsonDecode(
      await rootBundle.loadString('assets/portable-pack/manifest.json'),
    ) as Map;
    final root = (manifest['integrity'] as Map)['root'] as String;
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(root)) {
      throw StateError('Invalid bundled pack identity');
    }
    final directory = Directory('${support.path}/packs/$root');
    for (final path in files) {
      if (!RegExp(r'^(manifest\.json|blobs/sha256/[a-f0-9]{64})$')
          .hasMatch(path)) {
        throw StateError('Invalid bundled resource path');
      }
      final data = await rootBundle.load('assets/portable-pack/$path');
      final file = File('${directory.path}/$path');
      await file.parent.create(recursive: true);
      await file.writeAsBytes(
        data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
        flush: true,
      );
    }
    final owner = await WeappContainerController.create(
      storageKey: 'weapp-container-showcase-v1',
    );
    if (_closing || !mounted) {
      await owner.close();
      return;
    }
    _events = owner.events.listen(_event, onError: _fail);
    setState(() {
      _controller = owner;
      _status = '正在启动容器';
    });
    await WidgetsBinding.instance.endOfFrame;
    await owner.load(
      directory.path,
    ); // SDK verifies the manifest and every blob.
    _loaded = true;
    if (mounted && !_closing) {
      setState(() {
        _status = '本地演示 · 数据保存在此设备';
      });
    }
  }

  void _event(WeappContainerEvent event) {
    if (_closing || _closed) return;
    if (event.type == 'error') {
      _fail(StateError(event.fields.toString()));
      return;
    }
    if (event.type != 'message' || event.message is! Map) return;
    final message = Map<String, dynamic>.from(event.message as Map);
    if (message['protocolVersion'] != 1 || message['sessionId'] is! String) {
      return;
    }
    if (message['type'] == 'showcase.state.ready') {
      if (_guestSession == message['sessionId']) return;
      _dismissEditor();
      _guestSession = message['sessionId'] as String;
      unawaited(_recordRuntime({'guestReady': true}));
      _pendingText = null;
      unawaited(
        _send({
          'type': 'showcase.state.restore',
          'protocolVersion': 1,
          'sessionId': _guestSession,
          'state': _savedState,
        }).catchError(_fail),
      );
      return;
    }
    if (message['sessionId'] != _guestSession) return;
    if (message['type'] == 'showcase.close.request') {
      unawaited(_close().catchError(_fail));
      return;
    }
    if (message['type'] == 'showcase.text.dismiss' &&
        message['requestId'] == _pendingText?['requestId'] &&
        message['pageId'] == _pendingText?['pageId']) {
      _pendingText = null;
      _dismissEditor();
      return;
    }
    if (message['type'] == 'showcase.state.changed') {
      final encoded = jsonEncode(message['state']);
      if (utf8.encode(encoded).length > 128 * 1024) {
        _fail(StateError('State exceeds persistence limit'));
        return;
      }
      _savedState = message['state'];
      _queueState(encoded);
      unawaited(_recordRuntime({'guestStateChanged': true}));
      unawaited(_stateWrite.catchError(_fail));
    } else if (message['type'] == 'showcase.text.request' &&
        message['requestId'] is String &&
        message['pageId'] != null) {
      _pendingText = message;
      _dismissEditor();
      unawaited(_editText(message).catchError(_fail));
    }
  }

  Future<void> _recordRuntime(Map<String, dynamic> fields) {
    final output = Platform.environment['SHOWCASE_RUNTIME_REPORT'];
    if (output == null || output.isEmpty) return Future<void>.value();
    _runtime.addAll(fields);
    final encoded = jsonEncode(_runtime);
    _runtimeWrite = _runtimeWrite.then((_) async {
      final file = File(output), pending = File('$output.pending');
      await file.parent.create(recursive: true);
      await pending.writeAsString(encoded, flush: true);
      await pending.rename(file.path);
    });
    return _runtimeWrite;
  }

  void _queueState(String encoded) {
    Future<void> persist() async {
      final file = File('${_support!.path}/showcase-state.json'),
          temporary = File('${_support!.path}/showcase-state.pending');
      await temporary.writeAsString(encoded, flush: true);
      await temporary.rename(file.path);
    }

    _stateWrite = _stateWrite.then(
      (_) => persist(),
      onError: (Object error, StackTrace stack) => persist(),
    );
  }

  Future<void> _send(Map<String, dynamic> message) async {
    final owner = _controller;
    if (owner == null || _closing || _closed) return;
    await owner.sendMessage(message);
  }

  void _dismissEditor() {
    final route = _textRoute;
    _textRoute = null;
    // Remove only this owner's dialog. A global pop could dismiss a newer route
    // while the previous editor is completing its reverse transition.
    if (route != null && route.isActive) route.navigator?.removeRoute(route);
  }

  Future<void> _editText(Map<String, dynamic> request) async {
    if (_dialogOpen || !mounted) return;
    _dialogOpen = true;
    String? result;
    Route<String>? editorRoute;
    try {
      result = await showShowcaseTextDialog(
        context,
        request,
        onRoute: (route) {
          editorRoute = route;
          _textRoute = route;
        },
      );
    } finally {
      if (identical(_textRoute, editorRoute)) _textRoute = null;
      _dialogOpen = false;
    }
    if (_closing || _closed) return;
    final next = _pendingText;
    if (next != null && !identical(next, request)) {
      unawaited(_editText(next).catchError(_fail));
      return;
    }
    if (!identical(_pendingText, request) ||
        request['sessionId'] != _guestSession) {
      return;
    }
    _pendingText = null;
    await _send({
      'type': result == null ? 'showcase.text.cancel' : 'showcase.text.commit',
      'protocolVersion': 1,
      'sessionId': request['sessionId'],
      'pageId': request['pageId'],
      'requestId': request['requestId'],
      'value': ?result,
    });
  }

  Future<void> _close() => _closeOperation ??= _performClose().catchError((
    Object error,
    StackTrace stack,
  ) {
    _closeOperation = null;
    _fail(error, stack);
    throw error;
  });
  Future<void> _performClose() async {
    if (_closed) return;
    _closing = true;
    _pendingText = null;
    _guestSession = null;
    if (mounted) {
      setState(() {
        _status = '正在保存并关闭';
      });
    }
    _dismissEditor();
    if (_support != null) _queueState(jsonEncode(_savedState));
    await _stateWrite;
    // An early close can arrive while files or the controller are still being
    // created. _start observes _closing and closes its local owner in that case.
    if (_controller == null) await _startOperation;
    final owner = _controller;
    if (owner != null) {
      if (_loaded && !_storageFlushed) {
        await owner.flushStorage();
        _storageFlushed = true;
      }
      // Close retries join the SDK cleanup directly after ordinary RPCs have
      // been retired; repeating flushStorage would then be rejected.
      await owner.close();
    }
    await _startOperation;
    await _events?.cancel();
    _closed = true;
    await _recordRuntime({'storageFlushed': true, 'closed': true});
    if (mounted) {
      setState(() {
        _controller = null;
        _status = '演示已关闭';
      });
    }
  }

  @override
  Future<AppExitResponse> didRequestAppExit() async {
    try {
      await _close();
      return AppExitResponse.exit;
    } catch (_) {
      return AppExitResponse.cancel;
    }
  }

  @override
  void dispose() {
    _runtimeClose?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    unawaited(
      _close().catchError((Object error) {
        debugPrint('Showcase close failed: $error');
      }),
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: _closed,
    onPopInvokedWithResult: (didPop, result) async {
      if (didPop) return;
      try {
        await _close();
        if (mounted) await SystemNavigator.pop();
      } catch (_) {
        /* Retry close retains ownership. */
      }
    },
    // Platform view fills the actual window. Shared guest navigation protects
    // controls using the native hostLayout snapshot; host status only replaces
    // a guest that has not started, failed, or closed.
    child: Stack(
      fit: StackFit.expand,
      children: [
        // Keep the same platform view attached until owner.close completes.
        // Hiding an error must not start a competing detach/dispose operation.
        if (_controller != null && !_closed)
          IgnorePointer(
            ignoring: _closing || _failure != null,
            child: WeappContainerView(
              controller: _controller!,
              foreground: !_closing && _failure == null,
              onError: _fail,
            ),
          ),
        if (_controller == null || _closing || _closed || _failure != null)
          ColoredBox(
            color: const Color(0xfff7faf7),
            child: SafeArea(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!_closed && _failure == null)
                      const CircularProgressIndicator(),
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text(_failure ?? _status),
                    ),
                    if (_failure != null && !_closed)
                      TextButton(
                        onPressed: () => unawaited(_close().catchError(_fail)),
                        child: const Text('重试关闭'),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    ),
  );
}
