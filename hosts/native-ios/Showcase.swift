import UIKit
import WeappContainer

@main
final class ShowcaseApplication: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Showcase", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = ShowcaseScene.self
        return configuration
    }
}

@MainActor
final class ShowcaseScene: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var showcase: ShowcaseController?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let controller = ShowcaseController(); showcase = controller
        let window = UIWindow(windowScene: scene); window.rootViewController = controller
        window.makeKeyAndVisible(); self.window = window
    }
    func sceneWillResignActive(_ scene: UIScene) { showcase?.foreground(false) }
    func sceneDidBecomeActive(_ scene: UIScene) { showcase?.foreground(true) }
    func sceneDidDisconnect(_ scene: UIScene) { showcase?.releaseSession() }
}

@MainActor
final class ShowcaseController: UIViewController {
    private let session = WeappContainerSession(configuration: .init(storageKey: "showcase-native-ios-v1"))
    private var guestSession: String?
    private var pendingRequest: String?
    private var pendingPage: Double?
    private var latestState: Data?
    private var closing = false
    private var closed = false
    private var loaded = false
    private var storageFlushed = false
    private var closeOperation: Task<Void, Never>?
    private let status = UILabel()
    private let retryClose = UIButton(type: .system)
    private var surface: WeappContainerView?
    private var stateURL: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("WeappContainerShowcase/state.json")
    }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .systemBackground
        status.numberOfLines = 0; status.textAlignment = .center; status.isHidden = true
        retryClose.setTitle("关闭演示", for: .normal); retryClose.isHidden = true
        retryClose.addTarget(self, action: #selector(close), for: .touchUpInside)
        status.translatesAutoresizingMaskIntoConstraints = false; retryClose.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(status); view.addSubview(retryClose)
        NSLayoutConstraint.activate([status.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20), status.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20), status.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor), retryClose.centerXAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerXAnchor), retryClose.topAnchor.constraint(equalTo: status.bottomAnchor, constant: 16)])
        do {
            let surface = try WeappContainerView(session: session); self.surface = surface
            // The guest owns normal navigation and close controls. Host status is
            // only shown once there is no interactive guest, so no chrome can
            // overlap its safe layout or shrink its rendering surface.
            surface.translatesAutoresizingMaskIntoConstraints = false; view.insertSubview(surface, at: 0)
            NSLayoutConstraint.activate([surface.leadingAnchor.constraint(equalTo: view.leadingAnchor), surface.trailingAnchor.constraint(equalTo: view.trailingAnchor), surface.topAnchor.constraint(equalTo: view.topAnchor), surface.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
            session.onEvent = { [weak self] event in
                guard let self else { return }
                if case .message(let value) = event { self.message(value) }
                if case .error(let error) = event, !self.closing && !self.closed { self.showStatus(error.localizedDescription) }
            }
            guard let pack = Bundle.main.url(forResource: "portable-pack", withExtension: nil) else { throw NSError(domain: "Showcase", code: 1, userInfo: [NSLocalizedDescriptionKey: "Bundled pack missing"]) }
            Task { do { try await session.load(packURL: pack); loaded = true } catch { if !closing && !closed { showStatus(error.localizedDescription) } } }
        } catch { showStatus(error.localizedDescription) }
    }
    private func showStatus(_ text: String, canClose: Bool = true) { status.text = text; status.isHidden = false; surface?.isHidden = true; retryClose.isHidden = !canClose || closed }
    func foreground(_ visible: Bool) { if !closing { do { try session.setForeground(visible) } catch { showStatus(error.localizedDescription) } } }
    private func send(_ value: [String: WeappJSON]) { if !closing { do { try session.sendMessage(.object(value)) } catch { showStatus(error.localizedDescription) } } }
    private func message(_ message: WeappJSON) {
        guard !closing, message["protocolVersion"].number == 1, let identity = message["sessionId"].string else { return }
        if message["type"].string == "showcase.state.ready" {
            if guestSession == identity { return }
            guestSession = identity; pendingRequest = nil; pendingPage = nil; presentedViewController?.dismiss(animated: false)
            let bytes = try? Data(contentsOf: stateURL)
            let state = bytes.flatMap { $0.count <= 131072 ? try? JSONDecoder().decode(WeappJSON.self, from: $0) : nil } ?? .null
            send(["type": .string("showcase.state.restore"), "protocolVersion": .number(1), "sessionId": .string(identity), "state": state]); return
        }
        guard identity == guestSession else { return }
        if message["type"].string == "showcase.close.request" { close(); return }
        if message["type"].string == "showcase.text.dismiss", message["requestId"].string == pendingRequest, message["pageId"].number == pendingPage {
            pendingRequest = nil; pendingPage = nil; presentedViewController?.dismiss(animated: false); return
        }
        if message["type"].string == "showcase.state.changed", let data = try? JSONEncoder().encode(message["state"]), data.count <= 131072 {
            latestState = data; do { try persist() } catch { showStatus(error.localizedDescription) }
        } else if message["type"].string == "showcase.text.request", let request = message["requestId"].string, let page = message["pageId"].number {
            pendingRequest = request; pendingPage = page
            let editor = ShowcaseTextEditor(value: message["value"].string ?? "", limit: min(2000, max(1, Int(message["maxLength"].number ?? 200))), multiline: message["multiline"] == .bool(true))
            editor.title = message["title"].string ?? "填写内容"
            editor.reply = { [weak self] text in
                guard let self, !self.closing, self.guestSession == identity, self.pendingRequest == request, self.pendingPage == page else { return }
                self.pendingRequest = nil; self.pendingPage = nil
                let commit = text != nil
                var value: [String: WeappJSON] = ["type": .string(commit ? "showcase.text.commit" : "showcase.text.cancel"), "protocolVersion": .number(1), "sessionId": .string(identity), "pageId": message["pageId"], "requestId": .string(request)]
                if let text { value["value"] = .string(text) }
                self.send(value)
            }
            let navigation = UINavigationController(rootViewController: editor); navigation.modalPresentationStyle = .formSheet; navigation.isModalInPresentation = true
            let presentEditor = { [weak self] in
                guard let self, !self.closing, self.guestSession == identity, self.pendingRequest == request, self.pendingPage == page else { return }
                self.present(navigation, animated: true)
            }
            if presentedViewController != nil { dismiss(animated: false, completion: presentEditor) } else { presentEditor() }
        }
    }
    private func persist() throws {
        guard let latestState else { return }
        try FileManager.default.createDirectory(at: stateURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try latestState.write(to: stateURL, options: .atomic)
    }
    @objc private func close() {
        if closed || closeOperation != nil { return }; closing = true; pendingRequest = nil; pendingPage = nil; guestSession = nil; presentedViewController?.dismiss(animated: false)
        showStatus("正在保存并关闭", canClose: false)
        closeOperation = Task { defer { closeOperation = nil }; do {
                try persist()
                if loaded && !storageFlushed { try await session.flushStorage(); storageFlushed = true }
                // Once close starts, SDK rejects ordinary calls. A retry must
                // rejoin close directly rather than repeat flushStorage.
                try await session.close(); closed = true; status.text = "演示已关闭"
            } catch { status.text = "关闭失败：\(error.localizedDescription)"; retryClose.setTitle("重试关闭", for: .normal); retryClose.isHidden = false } }
    }
    func releaseSession() { close() }
}

@MainActor
final class ShowcaseTextEditor: UIViewController, UITextViewDelegate {
    var reply: ((String?) -> Void)?
    private let input = UITextView()
    private let initialValue: String
    private let limit: Int
    private let multiline: Bool
    init(value: String, limit: Int, multiline: Bool) {
        self.initialValue = value; self.limit = limit; self.multiline = multiline
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("Programmatic editor") }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .systemBackground
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "取消", style: .plain, target: self, action: #selector(cancel))
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "确认", style: .done, target: self, action: #selector(commit))
        input.text = initialValue; input.font = .preferredFont(forTextStyle: .body); input.delegate = self
        input.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(input)
        NSLayoutConstraint.activate([input.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20), input.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20), input.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20), input.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor, constant: -20)])
        input.becomeFirstResponder()
    }
    func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
        if !multiline && text.contains("\n") { commit(); return false }
        guard let range = Range(range, in: textView.text ?? "") else { return false }
        return textView.text.replacingCharacters(in: range, with: text).count <= limit
    }
    @objc private func cancel() { dismiss(animated: true); reply?(nil); reply = nil }
    @objc private func commit() { dismiss(animated: true); reply?(String(input.text.prefix(limit))); reply = nil }
}
