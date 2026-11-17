import React, {useEffect, useRef, useState} from 'react';
import {AppState, BackHandler, Button, Modal, SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WeappContainerController, WeappContainerView, type JSONObject, type JSONValue} from '@weapp-container/react-native';

const stateKey = 'weapp-container-showcase/state/v1';
type TextRequest = JSONObject & {sessionId: string; requestId: string; pageId: JSONValue};

export default function App() {
  const [controller, setController] = useState<WeappContainerController>();
  const [status, setStatus] = useState('正在准备演示');
  const [request, setRequest] = useState<TextRequest>();
  const [text, setText] = useState('');
  const [closed, setClosed] = useState(false);
  const owner = useRef<WeappContainerController | undefined>(undefined);
  const guest = useRef<string | undefined>(undefined);
  const pending = useRef<TextRequest | undefined>(undefined);
  const saved = useRef<JSONValue>(null);
  const latestEncoded = useRef<string | undefined>(undefined);
  const writing = useRef(Promise.resolve());
  const closeOperation = useRef<Promise<void> | undefined>(undefined);
  const closing = useRef(false);
  const mounted = useRef(true);
  const fail = (error: unknown) => {if (mounted.current) {setStatus(String(error));}};
  const send = async (message: JSONObject) => {
    if (!closing.current) {await owner.current?.sendMessage(message);}
  };
  const close = (): Promise<void> => {
    if (closeOperation.current) {return closeOperation.current;}
    closing.current = true;
    pending.current = undefined;
    guest.current = undefined;
    if (mounted.current) {setRequest(undefined); setStatus('正在保存并关闭');}
    const operation = (async () => {
      await writing.current.catch(() => {});
      if (latestEncoded.current !== undefined) {await AsyncStorage.setItem(stateKey, latestEncoded.current);}
      const current = owner.current;
      if (current) {await current.flushStorage(); await current.close();}
      owner.current = undefined;
      if (mounted.current) {setController(undefined); setClosed(true); setStatus('演示已关闭');}
    })();
    closeOperation.current = operation.catch(error => {
      closeOperation.current = undefined; fail(error); throw error;
    });
    return closeOperation.current;
  };
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    mounted.current = true;
    void (async () => {
      const encoded = await AsyncStorage.getItem(stateKey);
      if (encoded && encoded.length <= 128 * 1024) {
        try {saved.current = JSON.parse(encoded) as JSONValue;} catch {await AsyncStorage.removeItem(stateKey);}
      }
      const current = await WeappContainerController.create({storage: {key: 'weapp-container-showcase-v1'}});
      if (disposed || closing.current) {await current.close(); return;}
      owner.current = current;
      unsubscribe = current.subscribe(event => {
        if (closing.current) {return;}
        if (event.type === 'error') {fail(JSON.stringify(event.payload)); return;}
        if (event.type !== 'message' || !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {return;}
        const message = event.payload as JSONObject;
        if (message.protocolVersion !== 1 || typeof message.sessionId !== 'string') {return;}
        if (message.type === 'showcase.state.ready') {
          guest.current = message.sessionId; pending.current = undefined; setRequest(undefined);
          void send({type: 'showcase.state.restore', protocolVersion: 1, sessionId: message.sessionId, state: saved.current}).catch(fail);
          return;
        }
        if (message.sessionId !== guest.current) {return;}
        if (message.type === 'showcase.state.changed') {
          const state = message.state ?? null, next = JSON.stringify(state);
          if (next.length > 128 * 1024) {fail('State exceeds persistence limit'); return;}
          saved.current = state; latestEncoded.current = next;
          const persist = () => AsyncStorage.setItem(stateKey, next);
          writing.current = writing.current.then(persist, persist);
          void writing.current.catch(fail);
        } else if (message.type === 'showcase.text.request' && typeof message.requestId === 'string' && message.pageId != null) {
          pending.current = message as TextRequest; setRequest(pending.current);
          setText(typeof message.value === 'string' ? message.value : '');
        }
      });
      setController(current);
      await current.load({asset: 'portable-pack'});
      if (!disposed && !closing.current) {setStatus('本地演示 · 数据保存在此设备');}
    })().catch(fail);
    const lifecycle = AppState.addEventListener('change', state => {
      if (!closing.current) {void owner.current?.setForeground(state === 'active').catch(fail);}
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      void close().then(() => BackHandler.exitApp()).catch(() => {}); return true;
    });
    return () => {
      disposed = true; mounted.current = false; lifecycle.remove(); back.remove();
      // React cannot await unmount; explicit close and Android back use the
      // awaited barrier above. Native ownership stays retained on failure.
      void close().then(() => unsubscribe?.()).catch(console.error);
    };
    // One component owns one native session for its complete lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finishText = async (commit: boolean) => {
    const current = request;
    setRequest(undefined);
    if (!current || pending.current !== current || current.sessionId !== guest.current || closing.current) {return;}
    pending.current = undefined;
    const limit = Math.min(2000, Math.max(1, Number(current.maxLength) || 200));
    await send({type: commit ? 'showcase.text.commit' : 'showcase.text.cancel', protocolVersion: 1,
      sessionId: current.sessionId, pageId: current.pageId, requestId: current.requestId,
      ...(commit ? {value: text.slice(0, limit)} : {})});
  };
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}><Text style={styles.title}>Weapp Container</Text><Button title={closing.current && !closed ? '重试关闭' : '关闭演示'} disabled={closed} onPress={() => {void close().catch(() => {});}} /></View>
    <Text accessibilityLabel="showcase-status" style={styles.status}>{status}</Text>
    {controller && <WeappContainerView controller={controller} style={styles.surface} onSurfaceError={(error: {message: string}) => fail(error.message)} />}
    <Modal visible={Boolean(request)} transparent onRequestClose={() => {void finishText(false).catch(fail);}}>
      <View style={styles.shade}><View style={styles.dialog}>
        <Text style={styles.title}>{typeof request?.title === 'string' ? request.title : '填写内容'}</Text>
        <TextInput autoFocus value={text} onChangeText={setText} multiline={request?.multiline === true}
          maxLength={Math.min(2000, Math.max(1, Number(request?.maxLength) || 200))} style={styles.input} />
        <View style={styles.actions}><Button title="取消" onPress={() => {void finishText(false).catch(fail);}} /><Button title="确认" onPress={() => {void finishText(true).catch(fail);}} /></View>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#fff'}, header: {padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontSize: 18, fontWeight: '600'}, status: {paddingHorizontal: 16, paddingVertical: 8, fontSize: 12, backgroundColor: '#edf5f1'}, surface: {flex: 1},
  shade: {flex: 1, backgroundColor: '#0007', justifyContent: 'center', padding: 24}, dialog: {backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 16},
  input: {borderWidth: 1, borderColor: '#aaa', padding: 12, borderRadius: 8, minHeight: 48}, actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 16},
});
