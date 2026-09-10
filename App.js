import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
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
  // 업데이트 상태: null(확인중) | {version, apk_url} | 'up-to-date' | 'error'
  const [update, setUpdate] = useState(null);
  const [checking, setChecking] = useState(false);

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
      // APK asset 찾기 (matcha-*.apk)
      const apkAsset = (rel.assets || []).find(a => a.name.endsWith('.apk'));
      if (!apkAsset) {
        setUpdate('up-to-date');
        return;
      }

      // 버전 비교 (숫자 파싱)
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

  const downloadAndInstall = () => {
    if (!update || typeof update === 'string') return;
    // 안드로이드에서 브라우저/다운로더로 APK 열기 → 이후 시스템 설치
    Linking.openURL(update.apk_url).catch(err => {
      Alert.alert('다운로드 실패', err.message);
    });
  };

  const closeModalAndRefresh = () => {
    setUpdate(null);
    // 웹앱 새로고침은 WebView ref로 가능하나, 모달 닫기만 해도 사용 가능
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: WEB_URL }}
        style={styles.webview}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        geolocationEnabled={true}
        onLoadEnd={() => checkForUpdate()}   // 웹앱 로드 후 업데이트 확인
      />

      {/* 업데이트 다이얼로그 */}
      <Modal
        visible={update !== null && typeof update !== 'string'}
        transparent
        animationType="fade"
        onRequestClose={() => setUpdate(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>새 버전 사용 가능</Text>
            <Text style={styles.msg}>
              MATCHA v{typeof update === 'object' ? update.version : ''} 업데이트가
              준비되었습니다.
            </Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={downloadAndInstall}>
              <Text style={styles.btnPrimaryText}>업데이트</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setUpdate(null)}>
              <Text style={styles.btnGhostText}>나중에</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// "1.0.0" 같은 세그먼트 버전 비교 (a>b>0, a==b==0, a<b<0)
function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '80%',
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
