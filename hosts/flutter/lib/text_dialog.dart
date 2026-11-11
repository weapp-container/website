import 'package:flutter/material.dart';

Future<String?> showShowcaseTextDialog(
  BuildContext context,
  Map<String, dynamic> request, {
  void Function(Route<String> route)? onRoute,
}) {
  final navigator = Navigator.of(context, rootNavigator: true);
  final route = DialogRoute<String>(
    context: context,
    builder: (_) => _ShowcaseTextDialog(request: Map.of(request)),
    themes: InheritedTheme.capture(from: context, to: navigator.context),
  );
  onRoute?.call(route);
  return navigator.push(route);
}

class _ShowcaseTextDialog extends StatefulWidget {
  const _ShowcaseTextDialog({required this.request});
  final Map<String, dynamic> request;

  @override
  State<_ShowcaseTextDialog> createState() => _ShowcaseTextDialogState();
}

class _ShowcaseTextDialogState extends State<_ShowcaseTextDialog> {
  late final TextEditingController _text;

  @override
  void initState() {
    super.initState();
    final value = widget.request['value'];
    _text = TextEditingController(text: value is String ? value : '');
  }

  @override
  void dispose() {
    // Navigator's result completes before its reverse transition ends. Keep
    // the controller alive until the route's TextField is actually unmounted.
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final request = widget.request;
    final limit =
        (request['maxLength'] is num
                ? (request['maxLength'] as num).toInt()
                : 200)
            .clamp(1, 2000);
    final multiline = request['multiline'] == true;
    return AlertDialog(
      title: Text(
        request['title'] is String ? request['title'] as String : '填写内容',
      ),
      content: TextField(
        controller: _text,
        autofocus: true,
        maxLength: limit,
        minLines: multiline ? 3 : 1,
        maxLines: multiline ? 5 : 1,
        onSubmitted: multiline
            ? null
            : (value) => Navigator.pop(context, value),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _text.text),
          child: const Text('确认'),
        ),
      ],
    );
  }
}
