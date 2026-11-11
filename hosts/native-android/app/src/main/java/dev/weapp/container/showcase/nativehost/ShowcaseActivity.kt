package dev.weapp.container.showcase.nativehost

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.os.Build
import android.view.WindowInsets
import android.text.InputFilter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import com.sonofmagic.weapp.container.sdk.*
import org.json.JSONObject
import java.util.concurrent.CompletableFuture

class ShowcaseActivity : Activity() {
    private lateinit var session: WeappContainerSession
    private lateinit var status: TextView
    private var guestSession: String? = null
    private var pendingRequest: String? = null
    private var pendingPage: Any? = null
    private var editor: AlertDialog? = null
    private var closing = false
    private var closed = false
    private var latestState: String? = null
    private var closeOperation: CompletableFuture<Unit>? = null
    private var persistence = CompletableFuture.completedFuture<Void>(null)
    private val preferences by lazy { getSharedPreferences("showcase-state", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        layout.setOnApplyWindowInsetsListener { _, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                layout.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                layout.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            }
            insets
        }
        status = TextView(this).apply { text = "Weapp Container · 本地演示"; setPadding(24, 24, 24, 12) }
        val closeButton = Button(this).apply { text = "保存并关闭"; setOnClickListener { close() } }
        val view = WeappContainerView(this)
        layout.addView(status); layout.addView(closeButton); layout.addView(view, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(layout)
        layout.requestApplyInsets()
        session = WeappContainerSession(this, storageKey = "showcase-native-android-v1")
        session.eventListener = ContainerEventListener { event ->
            if (event.optString("type") == "error") status.text = event.toString()
            if (event.optString("type") == "message") event.optJSONObject("message")?.let { message(it) }
        }
        view.bind(session)
        session.load(PackSource.Asset("portable-pack")).whenComplete { _, error -> if (error != null) status.text = error.message }
    }
    private fun send(message: JSONObject) {
        if (!closing && !closed) session.sendMessage(message).whenComplete { _, error -> if (error != null) status.text = error.message }
    }
    private fun message(value: JSONObject) {
        if (closing || value.optInt("protocolVersion") != 1) return
        val identity = value.optString("sessionId")
        if (value.optString("type") == "showcase.state.ready") {
            guestSession = identity; pendingRequest = null; pendingPage = null
            val stored = preferences.getString("state", null)?.takeIf { it.toByteArray(Charsets.UTF_8).size <= 131072 }?.let { runCatching { JSONObject(it) }.getOrNull() }
            send(JSONObject().put("type", "showcase.state.restore").put("protocolVersion", 1).put("sessionId", identity).put("state", stored ?: JSONObject.NULL))
            return
        }
        if (identity != guestSession) return
        when (value.optString("type")) {
            "showcase.state.changed" -> {
                val state = value.optJSONObject("state")?.toString() ?: return
                if (state.toByteArray(Charsets.UTF_8).size > 131072) return
                latestState = state; queueState(state)
            }
            "showcase.text.request" -> {
                val requestId = value.optString("requestId"); val pageId = value.opt("pageId")
                if (requestId.isEmpty() || pageId == null || pageId == JSONObject.NULL) return
                pendingRequest = requestId; pendingPage = pageId; editor?.dismiss()
                val input = EditText(this).apply {
                    setText(value.optString("value")); setSingleLine(!value.optBoolean("multiline"))
                    filters = arrayOf(InputFilter.LengthFilter(value.optInt("maxLength", 200).coerceIn(1, 2000)))
                }
                fun reply(commit: Boolean) {
                    if (closing || guestSession != identity || pendingRequest != requestId || pendingPage != pageId) return
                    pendingRequest = null; pendingPage = null
                    val response = JSONObject().put("type", if (commit) "showcase.text.commit" else "showcase.text.cancel").put("protocolVersion", 1)
                        .put("sessionId", identity).put("pageId", value.opt("pageId")).put("requestId", requestId)
                    if (commit) response.put("value", input.text.toString())
                    send(response)
                }
                editor = AlertDialog.Builder(this).setTitle(value.optString("title", "填写内容")).setView(input)
                    .setNegativeButton("取消") { _, _ -> reply(false) }.setPositiveButton("确认") { _, _ -> reply(true) }
                    .setOnCancelListener { reply(false) }.show()
            }
        }
    }
    private fun queueState(state: String) {
        persistence = persistence.handle { _, _ -> null }.thenRunAsync {
            check(preferences.edit().putString("state", state).commit()) { "State persistence failed" }
        }
        persistence.whenComplete { _, error -> if (error != null) runOnUiThread { status.text = error.message } }
    }
    private fun close() {
        if (closed) { finish(); return }
        if (closeOperation != null) return
        closing = true; pendingRequest = null; pendingPage = null; guestSession = null; editor?.dismiss(); status.text = "正在保存并关闭"
        latestState?.let { queueState(it) }
        closeOperation = persistence.thenCompose { session.flushStorage() }.thenCompose { session.closeAsync() }
        closeOperation!!.whenComplete { _, error ->
            runOnUiThread { if (error == null) { closed = true; finish() } else { closeOperation = null; status.text = "关闭失败，点击保存并关闭重试：${error.message}" } }
        }
    }
    @Deprecated("Native back is awaited before releasing the session")
    override fun onBackPressed() { close() }
    override fun onPause() { if (::session.isInitialized && !closing) session.setForeground(false); super.onPause() }
    override fun onResume() { super.onResume(); if (::session.isInitialized && !closing) session.setForeground(true) }
    override fun onDestroy() {
        editor?.dismiss()
        if (::session.isInitialized && !closed) session.closeAsync().whenComplete { _, error -> if (error != null) android.util.Log.e("Showcase", "Session close failed", error) }
        super.onDestroy()
    }
}
