#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include "bridge.hpp"
static std::unique_ptr<showcase::Host> owner;
static HWND window = nullptr, editor = nullptr, input = nullptr;
static std::optional<showcase::Json> editRequest;
static std::wstring wide(const std::string& value) {
  const int size = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(), int(value.size()), nullptr, 0);
  std::wstring result(size, L'\0'); MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(), int(value.size()), result.data(), size); return result;
}
static std::string utf8(const std::wstring& value) {
  const int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value.data(), int(value.size()), nullptr, 0, nullptr, nullptr);
  std::string result(size, '\0'); WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value.data(), int(value.size()), result.data(), size, nullptr, nullptr); return result;
}
static void reply(bool accepted) {
  if (!editRequest) return;
  try {
    const auto request = *editRequest; editRequest.reset();
    if (accepted) { const int count = GetWindowTextLengthW(input); std::wstring value(count + 1, L'\0'); GetWindowTextW(input, value.data(), count + 1); value.resize(count); owner->reply(request, utf8(value)); }
    else owner->reply(request, std::nullopt);
  } catch (const std::exception& error) { owner->report(error.what()); }
  DestroyWindow(editor); editor = nullptr; EnableWindow(window, TRUE); SetForegroundWindow(window);
}
static LRESULT CALLBACK editProc(HWND handle, UINT message, WPARAM w, LPARAM l) {
  if (message == WM_CLOSE) { reply(false); return 0; }
  if (message == WM_COMMAND && LOWORD(w) == IDOK) { reply(true); return 0; }
  if (message == WM_COMMAND && LOWORD(w) == IDCANCEL) { reply(false); return 0; }
  return DefWindowProcW(handle, message, w, l);
}
static LRESULT CALLBACK windowProc(HWND handle, UINT message, WPARAM w, LPARAM l) {
  if (message == WM_ACTIVATEAPP && owner && owner->session && !owner->closing) {try {showcase::require(owner->session->set_foreground(w != 0));}catch(const std::exception& error){owner->report(error.what());} return 0;}
  if (message == WM_SIZE && owner && owner->view) {
    const double scale = GetDpiForWindow(handle) / 96.0; owner->view->set_bounds({0,0,LOWORD(l)/scale,HIWORD(l)/scale}); return 0;
  }
  if (message == WM_APP + 1) { if (editor) DestroyWindow(editor); DestroyWindow(handle); return 0; }
  if (message == WM_APP + 2 && editRequest && !owner->closing) {
    if (editor) DestroyWindow(editor);
    editor = CreateWindowExW(WS_EX_DLGMODALFRAME, L"ContainerShowcaseEdit", wide(editRequest->value("title", "填写内容")).c_str(), WS_CAPTION | WS_SYSMENU | WS_VISIBLE, CW_USEDEFAULT, CW_USEDEFAULT, 410, 200, window, nullptr, GetModuleHandleW(nullptr), nullptr);
    input = CreateWindowW(L"EDIT", wide(editRequest->value("value", "")).c_str(), WS_CHILD | WS_VISIBLE | WS_BORDER | ES_AUTOHSCROLL, 16, 20, 360, 36, editor, nullptr, GetModuleHandleW(nullptr), nullptr);
    SendMessageW(input, EM_LIMITTEXT, std::clamp(editRequest->value("maxLength", 200), 1, 2000), 0);
    CreateWindowW(L"BUTTON", L"确认", WS_CHILD | WS_VISIBLE | BS_DEFPUSHBUTTON, 190, 85, 84, 32, editor, reinterpret_cast<HMENU>(IDOK), GetModuleHandleW(nullptr), nullptr);
    CreateWindowW(L"BUTTON", L"取消", WS_CHILD | WS_VISIBLE, 290, 85, 84, 32, editor, reinterpret_cast<HMENU>(IDCANCEL), GetModuleHandleW(nullptr), nullptr);
    EnableWindow(window, FALSE); SetFocus(input); return 0;
  }
  if (message == WM_CLOSE) { try { if (owner) owner->close(); else DestroyWindow(handle); } catch (const std::exception& error) { owner->report(error.what()); } return 0; }
  if (message == WM_DESTROY) { PostQuitMessage(0); return 0; }
  return DefWindowProcW(handle, message, w, l);
}
int main(int argc, char** argv) {
  int count = 0; LPWSTR* arguments = CommandLineToArgvW(GetCommandLineW(), &count);
  wchar_t executable[32768]; const DWORD executableLength = GetModuleFileNameW(nullptr, executable, 32768);
  if (!executableLength || executableLength >= 32768) {if (arguments) LocalFree(arguments); return 2;}
  const auto pack = count == 2 ? utf8(arguments[1]) : utf8((std::filesystem::path(executable).parent_path() / L"portable-pack").wstring());
  if (arguments) LocalFree(arguments);
  SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
  WNDCLASSW type{}; type.lpfnWndProc = windowProc; type.hInstance = GetModuleHandleW(nullptr); type.lpszClassName = L"ContainerShowcase"; RegisterClassW(&type);
  type.lpfnWndProc = editProc; type.lpszClassName = L"ContainerShowcaseEdit"; RegisterClassW(&type);
  window = CreateWindowW(L"ContainerShowcase", L"Weapp Container · Native", WS_OVERLAPPEDWINDOW | WS_VISIBLE, 100, 60, 460, 850, nullptr, nullptr, GetModuleHandleW(nullptr), nullptr);
  if (!window) return 3;
  try {
    wchar_t support[32768]; const DWORD length = GetEnvironmentVariableW(L"LOCALAPPDATA", support, 32768); if (length == 0 || length >= 32768) throw std::runtime_error("LOCALAPPDATA unavailable");
    owner = std::make_unique<showcase::Host>(std::filesystem::path(support) / L"WeappContainerShowcaseNative");
    owner->report = [](const std::string& text) { SetWindowTextW(window, wide(text).c_str()); };
    owner->closed = [] { PostMessageW(window, WM_APP + 1, 0, 0); };
    owner->text_request = [](const showcase::Json& request) { editRequest = request; PostMessageW(window, WM_APP + 2, 0, 0); };
    RECT rect{}; GetClientRect(window, &rect); const double scale = GetDpiForWindow(window) / 96.0;
    owner->open(pack, window, {0,0,(rect.right-rect.left)/scale,(rect.bottom-rect.top)/scale});
    MSG message{}; while (GetMessageW(&message, nullptr, 0, 0) > 0) { if (editor && IsDialogMessageW(editor, &message)) continue; TranslateMessage(&message); DispatchMessageW(&message); }
    owner.reset(); return 0;
  } catch (const std::exception& error) { MessageBoxW(window, wide(error.what()).c_str(), L"Showcase failed", MB_ICONERROR); owner.reset(); DestroyWindow(window); return 1; }
}
