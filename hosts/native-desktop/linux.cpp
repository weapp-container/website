#include <gtk/gtk.h>
#include "bridge.hpp"
static std::unique_ptr<showcase::Host> owner;
static GtkWidget* window;
static bool loaded = false;
static std::string startup_error;
struct Edit { showcase::Json request; GtkWidget* entry; };
int main(int argc, char** argv) {
  const auto executableDirectory = std::filesystem::read_symlink("/proc/self/exe").parent_path();
  const std::string pack = argc == 2 ? argv[1] : (executableDirectory / "portable-pack").string();
  if (!gtk_init_check(&argc, &argv)) return 3;
  window = gtk_window_new(GTK_WINDOW_TOPLEVEL); gtk_window_set_title(GTK_WINDOW(window), "Weapp Container · Native"); gtk_window_set_default_size(GTK_WINDOW(window), 430, 780);
  GtkWidget* fixed = gtk_fixed_new(); gtk_container_add(GTK_CONTAINER(window), fixed); gtk_widget_show_all(window);
  try {
    owner = std::make_unique<showcase::Host>(std::filesystem::path(g_get_user_data_dir()) / "weapp-container-showcase-native");
    owner->report = [](const std::string& message) { gtk_window_set_title(GTK_WINDOW(window), message.c_str()); };
    owner->closed = [] { g_idle_add([](gpointer) -> gboolean { gtk_main_quit(); return G_SOURCE_REMOVE; }, nullptr); };
    owner->text_request = [](const showcase::Json& request) { g_idle_add([](gpointer data) -> gboolean {
      auto request = std::unique_ptr<showcase::Json>(static_cast<showcase::Json*>(data));
      GtkWidget* dialog = gtk_dialog_new_with_buttons(request->value("title", "填写内容").c_str(), GTK_WINDOW(window), GTK_DIALOG_MODAL, "取消", GTK_RESPONSE_CANCEL, "确认", GTK_RESPONSE_OK, nullptr);
      GtkWidget* input = gtk_entry_new(); gtk_entry_set_text(GTK_ENTRY(input), request->value("value", "").c_str());
      gtk_entry_set_max_length(GTK_ENTRY(input), std::clamp(request->value("maxLength", 200), 1, 2000));
      gtk_container_add(GTK_CONTAINER(gtk_dialog_get_content_area(GTK_DIALOG(dialog))), input);
      auto edit = new Edit{*request, input};
      g_signal_connect(dialog, "response", G_CALLBACK(+[](GtkDialog* dialog, gint response, gpointer data) {
        std::unique_ptr<Edit> edit(static_cast<Edit*>(data));
        try { owner->reply(edit->request, response == GTK_RESPONSE_OK ? std::optional<std::string>(gtk_entry_get_text(GTK_ENTRY(edit->entry))) : std::nullopt); }
        catch (const std::exception& error) { owner->report(error.what()); }
        gtk_widget_destroy(GTK_WIDGET(dialog));
      }), edit); gtk_widget_show_all(dialog); return G_SOURCE_REMOVE;
    }, new showcase::Json(request)); };
    owner->open(pack, fixed, {0,0,430,780}, false);
    // SDK metrics are accepted by its size-allocate handler. Load only after
    // that handler has observed a real allocation and its display monitor.
    auto* content = GTK_WIDGET(owner->view->native_handle());
    g_signal_connect_after(content, "size-allocate", G_CALLBACK(+[](GtkWidget*, GtkAllocation* allocation, gpointer data) {
      if (loaded || !owner || owner->closing || allocation->width < 1 || allocation->height < 1) return;
      try { owner->load(*static_cast<const std::string*>(data)); loaded = true; }
      catch (const std::exception& error) { startup_error = error.what(); g_printerr("%s\n", error.what()); gtk_main_quit(); }
    }), const_cast<std::string*>(&pack));
    gtk_widget_queue_resize(content);
    g_timeout_add(100, [](gpointer) -> gboolean { if (!owner || owner->closing) return G_SOURCE_REMOVE; try { owner->poll_runtime_check(); } catch (const std::exception& error) { owner->report(error.what()); } return G_SOURCE_CONTINUE; }, nullptr);
    g_signal_connect(window, "size-allocate", G_CALLBACK(+[](GtkWidget*, GdkRectangle* rectangle, gpointer) { if (owner && owner->view) owner->view->set_bounds({0,0,double(rectangle->width),double(rectangle->height)}); }), nullptr);
    g_signal_connect(window, "delete-event", G_CALLBACK(+[](GtkWidget*, GdkEvent*, gpointer) -> gboolean { try { owner->close(); } catch (const std::exception& error) { owner->report(error.what()); } return TRUE; }), nullptr);
    g_signal_connect(window, "window-state-event", G_CALLBACK(+[](GtkWidget*, GdkEventWindowState* event, gpointer) -> gboolean { if(owner && owner->session && !owner->closing) try {showcase::require(owner->session->set_foreground((event->new_window_state & (GDK_WINDOW_STATE_ICONIFIED | GDK_WINDOW_STATE_WITHDRAWN)) == 0));} catch(const std::exception& error){owner->report(error.what());} return FALSE; }), nullptr);
    gtk_main(); owner.reset(); gtk_widget_destroy(window); return startup_error.empty() ? 0 : 1;
  } catch (const std::exception& error) { g_printerr("%s\n", error.what()); return 1; }
}
