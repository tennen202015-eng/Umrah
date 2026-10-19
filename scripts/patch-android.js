// Runs once after "npx cap add android": icons, splash, location + vibration permissions,
// portrait lock, and keeping the screen on while the app is open.
const fs = require('fs'), path = require('path');
const res = 'android/app/src/main/res', man = 'android/app/src/main/AndroidManifest.xml';
if (!fs.existsSync(man)) { console.error('Run "npx cap add android" first.'); process.exit(1); }

for (const d of fs.readdirSync(res)) { const f = path.join(res, d, 'splash.png'); if (fs.existsSync(f)) fs.unlinkSync(f); }
const copy = (s, d) => { for (const f of fs.readdirSync(s)) { const a = path.join(s, f), b = path.join(d, f);
  if (fs.statSync(a).isDirectory()) { fs.mkdirSync(b, { recursive: true }); copy(a, b); } else fs.copyFileSync(a, b); } };
copy('android-res', res);

let m = fs.readFileSync(man, 'utf8');
if (!m.includes('xmlns:tools')) m = m.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"');
const block = [
  '    <!-- Asked once: precise location for counting rounds -->',
  '    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '    <uses-permission android:name="android.permission.VIBRATE" />',
  '    <uses-permission android:name="android.permission.WAKE_LOCK" />',
  '    <uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  '    <uses-feature android:name="android.hardware.sensor.gyroscope" android:required="false" />',
  '    <!-- Never requested -->',
  ...['CAMERA', 'RECORD_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO',
      'READ_MEDIA_AUDIO', 'READ_CONTACTS', 'READ_PHONE_STATE', 'ACCESS_BACKGROUND_LOCATION']
    .map(p => `    <uses-permission android:name="android.permission.${p}" tools:node="remove" />`)
].join('\n');
if (!m.includes('ACCESS_FINE_LOCATION')) m = m.replace('</manifest>', block + '\n</manifest>');
if (!m.includes('screenOrientation')) m = m.replace('<activity', '<activity\n            android:screenOrientation="portrait"');
fs.writeFileSync(man, m);

// MainActivity: keep the screen on so GPS and motion sensors keep running during tawaf and sa'i.
const find = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { const r = find(p); if (r) return r; } else if (f === 'MainActivity.java') return p; } return null; };
const act = find('android/app/src/main/java');
if (!act) { console.error('MainActivity.java not found'); process.exit(1); }
const pkg = (fs.readFileSync(act, 'utf8').match(/^package\s+[\w.]+;/m) || [''])[0];
fs.writeFileSync(act, `${pkg}

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
`);
console.log('android patched');
