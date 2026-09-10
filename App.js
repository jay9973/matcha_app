import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// MATCHA 웹앱 주소
const WEB_URL = 'https://matcha-food.vercel.app';

// 최신 릴리스 조회(public 저장소) — GitHub API
const REPO = 'jay9973/matcha_app';
// 업데이트 메타: 'latest' 릴리스에 고정 배포되는 static latest.json (GitHub API rate-limit 회피)
const LATEST_JSON_URL = `https://github.com/${REPO}/releases/download/latest/latest.json`;

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
  // 설치 가이드(다운로드 완료 후 안내) 표시 여부
  const [guide, setGuide] = useState(false);

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

  // 첫 로드 여부 (앱 시작 시 1회만 로고 표시, 재진입 reload는 로고 없이)
  const firstLoadRef = useRef(true);
  const handleLoadStart = () => {
    // 첫 로드에만 로고 표시 (재진입 reload는 웹만 배경 갱신)
    if (firstLoadRef.current) {
      setLoading(true);
      firstLoadRef.current = false;
    }
  };

  // 웹앱 로드 완료: 첫 로드면 최소시간(1.5초) 후 페이드아웃, 재진입이면 즉시 숨김 처리
  const handleLoadEnd = () => {
    checkForUpdate();
    setTimeout(hideLogo, MIN_LOGO_MS); // 항상 최소시간 대기하되, 첫 로드만 표시됨
  };

  const closeUpdate = () => setUpdate(null);

  // 최신 릴리스 확인
  const checkForUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try {
      // 'latest' 릴리스의 static latest.json 직접 fetch (GitHub API rate-limit 영향 없음)
      const res = await fetch(LATEST_JSON_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const meta = await res.json();
      const tagVersion = meta.version;
      const apkUrl = meta.apk_url;
      if (!apkUrl) { setUpdate('up-to-date'); return; }
      const newer = compareVersions(tagVersion, CURRENT_VERSION) > 0;
      setUpdate(newer ? { version: tagVersion, apk_url: apkUrl } : 'up-to-date');
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
              {'\n'}다운로드를 시작합니다.
            </Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => {
                if (update && typeof update === 'object') {
                  setOpenUrl(update.apk_url); // WebView로 APK 열어 OS 다운로더 기동
                  setUpdate(null);
                  setGuide(true); // 설치 가이드 표시
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

      {/* 설치 가이드 — 다운로드 완료 후 설치 방법 안내 */}
      {guide && (
        <View style={[styles.overlay, styles.modalRoot]}>
          <View style={styles.dialog}>
            <Text style={styles.title}>설치 안내</Text>
            <Text style={styles.msg}>
              APK 다운로드가 시작되었습니다.{'\n\n'}
              1. 화면 위 **다운로드 완료 알림**을 탭하세요.{'\n'}
              2. 표시되는 **APK 파일**을 탭하면 설치 화면이 열립니다.{'\n'}
              3. **설치** → **열기**(확인) 를 누르면 업데이트됩니다.{'\n\n'}
              ※ 알림에서 설치가 안 열리면, 파일 관리자에서{'\n'}
                'Download' 폴더의 matcha APK를 탭하세요.
            </Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => { setGuide(false); setOpenUrl(null); setLoading(true); }}>
              <Text style={styles.btnPrimaryText}>확인</Text>
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
  modalRoot: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
