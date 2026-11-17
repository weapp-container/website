//
//  Generated file. Do not edit.
//

// clang-format off

#include "generated_plugin_registrant.h"

#include <weapp_container_linux/weapp_container_linux_plugin.h>

void fl_register_plugins(FlPluginRegistry* registry) {
  g_autoptr(FlPluginRegistrar) weapp_container_linux_registrar =
      fl_plugin_registry_get_registrar_for_plugin(registry, "WeappContainerLinuxPlugin");
  weapp_container_linux_plugin_register_with_registrar(weapp_container_linux_registrar);
}
