import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  AppState,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// MATCHA 웹앱 주소
const WEB_URL = 'https://matcha-food.vercel.app';

// 최신 릴리스 조회(public 저장소) — GitHub API
const REPO = 'jay9973/matcha_app';
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;

// 현재 이 앱의 버전 (app.json의 version)
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

// 로고 최소 표시 시간(ms) — 이보다 빨리 끝나도 최소한 보여줌
const MIN_LOGO_MS = 1500;
// 페이드 전환 길이
const FADE_MS = 320;

export default function App() {
  // 업데이트 상태
  const [update, setUpdate] = useState(null);
  const [checking, setChecking] = useState(false);
  // 로딩(로고) 상태
  const [loading, setLoading] = useState(true);
  const [openUrl, setOpenUrl] = useState(null);

  const webviewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current; // 0(투명) → 1(불투명)

  // 마운트 시: 최소 시간 보장 + 로고 페이드인
  useEffect(() => {
    const fadeIn = Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true });
    // fade in과 동시에 최소 표시 타이머 시작
    fadeIn.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideLogo = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => {
      setLoading(false);
    });
  };

  // 웹앱 로드 완료: 최소시간(1.5초) 보장 후 페이드아웃
  const handleLoadEnd = () => {
    checkForUpdate();
    // 이미 로고가 최소시간만큼 떴는지와 무관하게, 최소시간을 기다렸다가 페이드아웃
    const startedAt = Date.now();
    const elapsed = startedAt - (firstLoadRef.current || startedAt);
    const wait = Math.max(0, MIN_LOGO_MS - elapsed);
    setTimeout(hideLogo, wait);
  };

  // 첫 로드 시작 시각 보정(매 로드 시 초기화되는 로직 방지용)
  const firstLoadRef = useRef(null);
  const handleLoadStart = () => {
    if (!firstLoadRef.current) firstLoadRef.current = Date.now();
    setLoading(true);
  };

  // 백그라운드 → 포그라운드 전환 시 웹 코드 최신화(reload)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && webviewRef.current) {
        // 완전종료 전 재접속 때마다 최신 웹 소스로 갱신
        webviewRef.current.reload();
      }
    });
    return () => sub.remove();
  }, []);

  const closeUpdate = () => setUpdate(null);

  // 최신 릴리스 확인
  const checkForUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await fetch(LATEST_API, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rel = await res.json();
      const tagVersion = rel.tag_name;
      const apkAsset = (rel.assets || []).find(a => a.name.endsWith('.apk'));
      if (!apkAsset) { setUpdate('up-to-date'); return; }
      const newer = compareVersions(tagVersion, CURRENT_VERSION) > 0;
      setUpdate(newer ? { version: tagVersion, apk_url: apkAsset.browser_download_url } : 'up-to-date');
    } catch (e) {
      console.warn('업데이트 확인 실패:', e.message);
      setUpdate('error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        ref={webviewRef}
        source={{ uri: openUrl || WEB_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        geolocationEnabled={true}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
      />

      {/* 로딩 오버레이 — 로고 + 페이드 전환 (최소 1.5초 유지) */}
      {loading && (
        <Animated.View style={[styles.loadingWrap, { opacity: fadeAnim }]}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.loadingIcon}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* 업데이트 오버레이 */}
      {update !== null && typeof update === 'object' && (
        <View style={[styles.overlay, styles.modalRoot]}>
          <View style={styles.dialog}>
            <Text style={styles.title}>새 버전 사용 가능</Text>
            <Text style={styles.msg}>
              MATCHA v{update.version} 업데이트가 준비되었습니다.
            </Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => {
                if (update && typeof update === 'object') {
                  setOpenUrl(update.apk_url);
                  setUpdate(null);
                }
              }}
            >
              <Text style={styles.btnPrimaryText}>업데이트</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={closeUpdate}>
              <Text style={styles.btnGhostText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// "1.0.0" 세그먼트 버전 비교 (a>b:>0, a==b:0, a<b:<0)
function compareVersions(a, b) {
  const pa = String(a || '').replace(/^v/, '').split('.').map(x => Number(x) || 0);
  const pb = String(b || '').replace(/^v/, '').split('.').map(x => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  modalRoot: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  overlay: { backgroundColor: 'rgba(0,0,0,0.45)' },
  // 로딩 화면 (흰 배경 + 로고 중앙)
  loadingWrap: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 140,
    height: 140,
  },
  dialog: {
    width: '84%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#191919', marginBottom: 8 },
  msg: { fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  btnPrimary: {
    alignSelf: 'stretch',
    backgroundColor: '#ffe400',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnPrimaryText: { color: '#191919', fontWeight: '700', fontSize: 15 },
  btnGhost: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 8 },
  btnGhostText: { color: '#888', fontSize: 13 },
});
