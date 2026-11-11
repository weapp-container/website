import 'package:container_showcase/text_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final action in ['确认', '取消', 'host-close', 'keyboard-submit']) {
    testWidgets('focused Chinese input survives $action route dismissal', (
      tester,
    ) async {
      String? result;
      var completed = false;
      final navigator = GlobalKey<NavigatorState>();
      await tester.pumpWidget(
        MaterialApp(
          navigatorKey: navigator,
          home: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                result = await showShowcaseTextDialog(context, {
                  'title': '搜索商品',
                  'value': '咖啡',
                  'maxLength': 20,
                });
                completed = true;
              },
              child: const Text('open'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '中文拿铁');
      if (action == 'host-close') {
        navigator.currentState!.pop();
      } else if (action == 'keyboard-submit') {
        await tester.testTextInput.receiveAction(TextInputAction.done);
      } else {
        await tester.tap(find.text(action));
      }
      // Navigator returns the result before the dialog's reverse transition.
      await tester.pump();
      expect(completed, isTrue);
      expect(
        result,
        action == '确认' || action == 'keyboard-submit' ? '中文拿铁' : isNull,
      );
      await tester.pump(const Duration(milliseconds: 50));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.byType(TextField), findsNothing);
    });
  }

  testWidgets('folding an open dialog preserves Chinese remarks until commit', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(466, 678);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    String? result;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await showShowcaseTextDialog(context, {
                'title': '备注',
                'multiline': true,
              });
            },
            child: const Text('open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '少糖\n请打包');
    tester.view.physicalSize = const Size(951, 669);
    await tester.pumpAndSettle();
    expect(find.text('少糖\n请打包'), findsOneWidget);
    tester.view.physicalSize = const Size(669, 951);
    await tester.pumpAndSettle();
    expect(find.text('少糖\n请打包'), findsOneWidget);
    await tester.tap(find.text('确认'));
    await tester.pumpAndSettle();
    expect(result, '少糖\n请打包');
    expect(tester.takeException(), isNull);
  });
  testWidgets('host dismissal removes only the exact owned editor route', (
    tester,
  ) async {
    final navigator = GlobalKey<NavigatorState>();
    Route<String>? editor;
    var completed = false;
    String? result;
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigator,
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () async {
              result = await showShowcaseTextDialog(context, {
                'title': '备注',
              }, onRoute: (route) => editor = route);
              completed = true;
            },
            child: const Text('open'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '旧页面输入');
    // Another route may become current before a delayed owner dismissal.
    navigator.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => const Scaffold(body: Text('newer route')),
      ),
    );
    await tester.pumpAndSettle();
    expect(editor!.isCurrent, isFalse);
    editor!.navigator!.removeRoute(editor!);
    await tester.pumpAndSettle();
    expect(completed, isTrue);
    expect(result, isNull);
    expect(find.text('newer route'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
