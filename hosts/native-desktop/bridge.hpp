#pragma once
#include <weapp/desktop.hpp>
#include <nlohmann/json.hpp>
#include <filesystem>
#include <algorithm>
#include <fstream>
#include <optional>
#include <stdexcept>
#include <type_traits>
#include <cstdlib>
#ifdef _WIN32
#include <process.h>
#else
#include <unistd.h>
#endif

namespace showcase {
using namespace weapp::desktop;
using Json = nlohmann::json;
inline Value from_json(const Json& value) {
  if (value.is_null()) return nullptr;
  if (value.is_boolean()) return value.get<bool>();
  if (value.is_number()) return value.get<double>();
  if (value.is_string()) return value.get<std::string>();
  if (value.is_array()) { Value::Array result; for (const auto& item : value) result.push_back(from_json(item)); return result; }
  Value::Object result; for (auto it = value.begin(); it != value.end(); ++it) result.emplace(it.key(), from_json(it.value())); return result;
}
inline Json to_json(const Value& value) {
  return std::visit([](const auto& item) -> Json {
    using T = std::decay_t<decltype(item)>;
    if constexpr (std::is_same_v<T, std::monostate>) return nullptr;
    else if constexpr (std::is_same_v<T, Value::Array>) { auto result = Json::array(); for (const auto& child : item) result.push_back(to_json(child)); return result; }
    else if constexpr (std::is_same_v<T, Value::Object>) { auto result = Json::object(); for (const auto& [key, child] : item) result[key] = to_json(child); return result; }
    else return item;
  }, value.data);
}
inline void require(Status status) { if (!status) throw std::runtime_error(status.code + ": " + status.message); }
class Host {
 public:
  std::shared_ptr<Session> session;
  std::unique_ptr<View> view;
  std::function<void(const Json&)> text_request;
  std::function<void(const std::string&)> report;
  std::function<void()> closed;
  bool closing = false;
  explicit Host(std::filesystem::path support) : support_(std::getenv("SHOWCASE_RUNTIME_SUPPORT") ? std::filesystem::path(std::getenv("SHOWCASE_RUNTIME_SUPPORT")) : std::move(support)) {
    std::filesystem::create_directories(support_);
    runtime_status({{"started", true}});
    try { std::ifstream file(support_ / "state.json"); if (file) { file >> state_; if (state_.dump().size() > 131072) state_ = nullptr; } } catch (...) { state_ = nullptr; }
  }
  void open(const std::string& pack, void* parent, const weapp::desktop::Rect& bounds, bool load_immediately = true) {
    Config config; config.storage_key = "showcase-native-desktop-v1"; config.storage_root = support_.string();
    // The SDK exposes native raster presenters on Windows/Linux. Select that
    // contract explicitly so the demo also runs on machines without a GPU.
#ifdef __APPLE__
    config.require_gpu = true;
#else
    config.require_gpu = false;
#endif
    Status status; session = Session::create(config, status); require(status);
    session->on_event([this](const Event& event) {
      try {
        if (event.type == EventType::Closed) { runtime_status({{"closed", true}}); if (closed) closed(); return; }
        if (event.type == EventType::Error) { const auto error = to_json(Value(event.fields)).dump(); runtime_status({{"error", error}}); if (report) report(error); return; }
        if (closing || event.type != EventType::Message) return;
        auto found = event.fields.find("message"); if (found == event.fields.end()) return;
        const auto value = to_json(found->second);
        if (value.value("protocolVersion", 0) != 1 || !value.contains("sessionId") || !value["sessionId"].is_string()) return;
        if (value.value("type", "") == "showcase.state.ready") {
          identity_ = value["sessionId"].get<std::string>(); pending_.reset();
          runtime_status({{"guestReady", true}});
          send({{"type", "showcase.state.restore"}, {"protocolVersion", 1}, {"sessionId", identity_}, {"state", state_}});
        } else if (value["sessionId"] == identity_ && value.value("type", "") == "showcase.state.changed") {
          const auto encoded = value.at("state").dump(); if (encoded.size() > 131072) return;
          state_ = value["state"]; dirty_ = true; persist();
          runtime_status({{"guestStateChanged", true}});
        } else if (value["sessionId"] == identity_ && value.value("type", "") == "showcase.text.request") {
          pending_ = value; if (text_request) text_request(value);
        }
      } catch (const std::exception& error) { runtime_status({{"error", error.what()}}); if (report) report(error.what()); }
    });
    view = View::create(session, parent, bounds, status); require(status);
    if (load_immediately) load(pack);
  }
  void load(const std::string& pack) { require(session->load(pack)); }
  void send(const Json& value) { if (!closing) require(session->send_message(from_json(value))); }
  void reply(const Json& request, const std::optional<std::string>& text) {
    if (closing || !pending_ || *pending_ != request || request["sessionId"] != identity_) return;
    pending_.reset();
    auto reply = Json{{"type", text ? "showcase.text.commit" : "showcase.text.cancel"}, {"protocolVersion", 1}, {"sessionId", identity_}, {"pageId", request["pageId"]}, {"requestId", request["requestId"]}};
    if (text) reply["value"] = *text;
    send(reply);
  }
  void close() {
    if (!session || session->state().status == SessionState::Closed) { if (closed) closed(); return; }
    closing = true; pending_.reset(); if (dirty_) persist(); require(session->flush_storage()); runtime_status({{"storageFlushed", true}}); require(session->close());
    // The window and native event loop remain alive until EventType::Closed.
  }
  void poll_runtime_check() {
    const auto request = std::getenv("SHOWCASE_RUNTIME_CLOSE_FILE");
    if (request && *request && !closing && std::filesystem::is_regular_file(request)) close();
  }
 private:
  std::filesystem::path support_;
  Json state_ = nullptr;
  std::string identity_;
  std::optional<Json> pending_;
  bool dirty_ = false;
  Json runtime_ = {{"schemaVersion", 1}, {"family", "native"}, {"pid",
#ifdef _WIN32
    _getpid()
#else
    getpid()
#endif
  }};
  void runtime_status(const Json& fields) {
    const auto output = std::getenv("SHOWCASE_RUNTIME_REPORT"); if (!output || !*output) return;
    runtime_.update(fields); const std::filesystem::path destination(output), temporary(std::string(output) + ".pending");
    std::filesystem::create_directories(destination.parent_path());
    std::ofstream file(temporary, std::ios::binary | std::ios::trunc); file << runtime_.dump(); file.flush(); file.close();
    if (!file) throw std::runtime_error("Runtime evidence write failed");
#ifdef _WIN32
    if (!MoveFileExW(temporary.c_str(), destination.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) throw std::runtime_error("Runtime evidence replacement failed");
#else
    std::filesystem::rename(temporary, destination);
#endif
  }
  void persist() {
    const auto temporary = support_ / "state.pending", destination = support_ / "state.json";
    std::ofstream file(temporary, std::ios::binary | std::ios::trunc); file << state_.dump(); file.flush(); file.close();
    if (!file) throw std::runtime_error("State persistence failed");
#ifdef _WIN32
    if (!MoveFileExW(temporary.c_str(), destination.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) throw std::runtime_error("State replacement failed");
#else
    std::filesystem::rename(temporary, destination);
#endif
    dirty_ = false;
  }
};
}
