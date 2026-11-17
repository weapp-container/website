#import <AppKit/AppKit.h>
#include "bridge.hpp"

@interface ShowcaseDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate>
@end
static std::unique_ptr<showcase::Host> owner;
static NSWindow* window;
static NSString* packPath;
@implementation ShowcaseDelegate
- (void)applicationDidFinishLaunching:(NSNotification*)notification {
  NSMenu* menu = [[NSMenu alloc] init];
  NSMenuItem* applicationItem = [[NSMenuItem alloc] init]; [menu addItem:applicationItem];
  NSMenu* applicationMenu = [[NSMenu alloc] initWithTitle:@"Showcase"];
  NSMenuItem* quit = [[NSMenuItem alloc] initWithTitle:@"保存并退出" action:@selector(closeShowcase:) keyEquivalent:@"q"]; quit.target = self;
  [applicationMenu addItem:quit]; applicationItem.submenu = applicationMenu;
  NSMenuItem* windowItem = [[NSMenuItem alloc] init]; [menu addItem:windowItem];
  NSMenu* windowMenu = [[NSMenu alloc] initWithTitle:@"窗口"];
  NSMenuItem* close = [[NSMenuItem alloc] initWithTitle:@"保存并关闭" action:@selector(closeShowcase:) keyEquivalent:@"w"]; close.target = self;
  [windowMenu addItem:close]; windowItem.submenu = windowMenu; NSApp.mainMenu = menu;
  window = [[NSWindow alloc] initWithContentRect:NSMakeRect(100, 80, 430, 780) styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable backing:NSBackingStoreBuffered defer:NO];
  window.releasedWhenClosed = NO; window.delegate = self; window.title = @"Weapp Container · Native";
  [window makeKeyAndOrderFront:nil]; [NSApp activateIgnoringOtherApps:YES];
  try {
    NSURL* support = [[NSFileManager defaultManager] URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask].firstObject;
    owner = std::make_unique<showcase::Host>(std::string(support.fileSystemRepresentation) + "/WeappContainerShowcaseNative");
    owner->report = [](const std::string& message) { dispatch_async(dispatch_get_main_queue(), ^{ window.title = [NSString stringWithUTF8String:message.c_str()]; }); };
    owner->closed = [] { dispatch_async(dispatch_get_main_queue(), ^{
      [window orderOut:nil]; [NSApp stop:nil];
      // stop: is invoked from an asynchronous SDK completion, outside an
      // AppKit event. Wake the event loop so run can return and release owner.
      [NSApp postEvent:[NSEvent otherEventWithType:NSEventTypeApplicationDefined location:NSZeroPoint modifierFlags:0 timestamp:0 windowNumber:0 context:nil subtype:0 data1:0 data2:0] atStart:NO];
    }); };
    owner->text_request = [](const showcase::Json& request) { dispatch_async(dispatch_get_main_queue(), ^{
      NSAlert* alert = [[NSAlert alloc] init]; alert.messageText = [NSString stringWithUTF8String:request.value("title", "填写内容").c_str()];
      [alert addButtonWithTitle:@"确认"]; [alert addButtonWithTitle:@"取消"];
      NSTextField* input = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 320, 28)]; input.stringValue = [NSString stringWithUTF8String:request.value("value", "").c_str()]; alert.accessoryView = input;
      [alert beginSheetModalForWindow:window completionHandler:^(NSModalResponse response) {
        try { if (response == NSAlertFirstButtonReturn) owner->reply(request, std::string(input.stringValue.UTF8String)); else owner->reply(request, std::nullopt); }
        catch (const std::exception& error) { window.title = [NSString stringWithUTF8String:error.what()]; }
      }];
    }); };
    const auto size = window.contentView.bounds.size;
    owner->open(packPath.fileSystemRepresentation, (__bridge void*)window.contentView, {0, 0, size.width, size.height});
  } catch (const std::exception& error) { window.title = [NSString stringWithUTF8String:error.what()]; }
}
- (void)windowDidResize:(NSNotification*)notification {
  if (owner && owner->view) { const auto size = window.contentView.bounds.size; owner->view->set_bounds({0,0,size.width,size.height}); }
}
- (void)applicationDidResignActive:(NSNotification*)notification { if(owner && owner->session && !owner->closing) try {showcase::require(owner->session->set_foreground(false));} catch(const std::exception& error){owner->report(error.what());} }
- (void)applicationDidBecomeActive:(NSNotification*)notification { if(owner && owner->session && !owner->closing) try {showcase::require(owner->session->set_foreground(true));} catch(const std::exception& error){owner->report(error.what());} }
- (BOOL)windowShouldClose:(NSWindow*)sender {
  try { if (owner) owner->close(); else [NSApp stop:nil]; } catch (const std::exception& error) { window.title = [NSString stringWithUTF8String:error.what()]; }
  return NO;
}
- (void)closeShowcase:(id)sender { [self windowShouldClose:window]; }
- (NSApplicationTerminateReply)applicationShouldTerminate:(NSApplication*)sender { [self windowShouldClose:window]; return NSTerminateCancel; }
@end
int main(int argc, char** argv) {
  @autoreleasepool {
    packPath = argc == 2 ? [NSString stringWithUTF8String:argv[1]] : [NSBundle.mainBundle.resourcePath stringByAppendingPathComponent:@"portable-pack"];
    [NSApplication sharedApplication]; [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    ShowcaseDelegate* delegate = [[ShowcaseDelegate alloc] init]; NSApp.delegate = delegate; [NSApp run]; owner.reset(); return 0;
  }
}
