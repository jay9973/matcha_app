import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ActivityIndicator,
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

export default function App() {
  // 업데이트 상태: null(확인중/없음) | {version, apk_url} | 'up-to-date' | 'error'
  const [update, setUpdate] = useState(null);
  const [checking, setChecking] = useState(false);
  // 로딩 상태: 웹앱이 뜨기 전 로딩 화면 표시
  const [loading, setLoading] = useState(true);
  // APK 다운로드를 위해 WebView로 잠시 열 URL (OS 다운로더 트리거)
  const [openUrl, setOpenUrl] = useState(null);

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

      // 버전은 태그명. 예: "1.1.0"
      const tagVersion = rel.tag_name;
      // APK asset 찾기
      const apkAsset = (rel.assets || []).find(a => a.name.endsWith('.apk'));
      if (!apkAsset) {
        setUpdate('up-to-date');
        return;
      }

      // 버전 비교
      const newer = compareVersions(tagVersion, CURRENT_VERSION) > 0;
      if (newer) {
        setUpdate({ version: tagVersion, apk_url: apkAsset.browser_download_url });
      } else {
        setUpdate('up-to-date');
      }
    } catch (e) {
      console.warn('업데이트 확인 실패:', e.message);
      setUpdate('error');
    } finally {
      setChecking(false);
    }
  };

  const closeUpdate = () => setUpdate(null);

  // APK 다운로드: WebView를 해당 URL로 잠시 열어 시스템 브라우저/다운로더로 유도
  // (네이티브 category는 서명·권한에 따라 상이 — 여기선 사용자에게 URL 복사 방법도 제공)
  const getApkUrl = () => {
    if (update && typeof update === 'object') return update.apk_url;
    return '';
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: openUrl || WEB_URL }}
        style={styles.webview}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        geolocationEnabled={true}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => { setLoading(false); checkForUpdate(); }}
      />

      {/* 로딩 오버레이 — 웹앱 뜨기 전, 아이콘 + 회전 스피너 */}
      {loading && (
        <View style={[styles.overlay, styles.loadingWrap]}>
          <View style={styles.loadingCard}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.loadingIcon}
              resizeMode="contain"
            />
            <Text style={styles.loadingText}>MATCHA</Text>
          </View>
        </View>
      )}

      {/* 업데이트 오버레이(순수 View) — 새 버전 있을 때 */}
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
                // WebView로 APK URL을 열어 OS 다운로더/설치 화면을 트리거
                if (update && typeof update === 'object') {
                  setOpenUrl(update.apk_url);
                  setUpdate(null); // 다이얼로그 닫기
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
  // 로딩 화면 (흰 배경 + 아이콘 + 스피너)
  loadingWrap: {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 140,
    height: 140,
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#191919',
    letterSpacing: 1,
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