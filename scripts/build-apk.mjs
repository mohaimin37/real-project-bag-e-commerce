import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

console.log('==> Starting Wildtane Android APK Builder...');

const BUILD_DIR = path.resolve('scratch/apk_build');
rmSync(BUILD_DIR, { recursive: true, force: true });
mkdirSync(path.join(BUILD_DIR, 'res/mipmap'), { recursive: true });
mkdirSync(path.join(BUILD_DIR, 'res/values'), { recursive: true });
mkdirSync(path.join(BUILD_DIR, 'src/com/wildtane/store'), { recursive: true });
mkdirSync(path.join(BUILD_DIR, 'bin'), { recursive: true });

// Copy App Icon
copyFileSync('client/public/logo-192.png', path.join(BUILD_DIR, 'res/mipmap/icon.png'));

// Strings
writeFileSync(
  path.join(BUILD_DIR, 'res/values/strings.xml'),
  `<resources>
    <string name="app_name">WILDTANE</string>
</resources>`
);

// AndroidManifest.xml
writeFileSync(
  path.join(BUILD_DIR, 'AndroidManifest.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.wildtane.store"
    android:versionCode="20"
    android:versionName="2.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/icon"
        android:roundIcon="@mipmap/icon"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">
        <activity
            android:name="com.wildtane.store.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
);

// MainActivity.java
writeFileSync(
  path.join(BUILD_DIR, 'src/com/wildtane/store/MainActivity.java'),
  `package com.wildtane.store;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private final static int FILE_CHOOSER_RESULT_CODE = 1001;
    private final static String HOME_URL = "https://www.wildtane.com";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark Luxury Status Bar matching WILDTANE branding
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0C0C0C"));
        window.setNavigationBarColor(Color.parseColor("#0C0C0C"));

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.parseColor("#0C0C0C"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0C0C0C"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);
        settings.setUserAgentString(settings.getUserAgentString() + " WildtaneApp/2.0");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") || url.startsWith("https://wa.me/")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }
                if (url.startsWith("upi:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception ignored) {}
                }
                if (url.contains("wildtane.com")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
                return true;
            }
        });

        layout.addView(webView);
        setContentView(layout);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(HOME_URL);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    } else if (data.getClipData() != null) {
                        final int numSelectedFiles = data.getClipData().getItemCount();
                        results = new Uri[numSelectedFiles];
                        for (int i = 0; i < numSelectedFiles; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`
);

const ANDROID_JAR = 'D:\\dev\\android-sdk\\platforms\\android-34\\android.jar';
const BUILD_TOOLS = 'D:\\dev\\android-sdk\\build-tools\\35.0.0';
const AAPT2 = path.join(BUILD_TOOLS, 'aapt2.exe');
const D8 = path.join(BUILD_TOOLS, 'd8.bat');
const ZIPALIGN = path.join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER = path.join(BUILD_TOOLS, 'apksigner.bat');
const JAVAC = 'D:\\dev\\jdk17\\bin\\javac.exe';
const KEYTOOL = 'D:\\dev\\jdk17\\bin\\keytool.exe';

const run = (cmd, cwd = BUILD_DIR) => {
  console.log(`[CMD] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

// 1. Compile Resources with AAPT2
run(`"${AAPT2}" compile --dir res -o compiled_res.zip`);

// 2. Link with AAPT2
run(`"${AAPT2}" link -I "${ANDROID_JAR}" compiled_res.zip --manifest AndroidManifest.xml -o unaligned.apk --java src`);

// 3. Compile Java with javac
run(`"${JAVAC}" -cp "${ANDROID_JAR}" -d bin src/com/wildtane/store/R.java src/com/wildtane/store/MainActivity.java`);

// 4. Dex with D8
run(`cmd /c ""${D8}" --lib "${ANDROID_JAR}" --output . bin/com/wildtane/store/*.class"`);

// 5. Add classes.dex into unaligned.apk using jar or zip
run(`"D:\\dev\\jdk17\\bin\\jar.exe" -uf unaligned.apk classes.dex`);

// 6. ZipAlign
run(`"${ZIPALIGN}" -v -p 4 unaligned.apk wildtane-aligned.apk`);

// 7. Create keystore if not exists
const KEYSTORE = path.resolve('scratch/wildtane-release.keystore');
if (!existsSync(KEYSTORE)) {
  run(`"${KEYTOOL}" -genkey -v -keystore "${KEYSTORE}" -alias wildtane -keyalg RSA -keysize 2048 -validity 10000 -storepass wildtane123 -keypass wildtane123 -dname "CN=Wildtane, O=Wildtane Private Limited, C=IN"`);
}

// 8. Sign with apksigner
const TARGET_APK = path.resolve('client/public/wildtane.apk');
run(`cmd /c ""${APKSIGNER}" sign --ks "${KEYSTORE}" --ks-pass pass:wildtane123 --key-pass pass:wildtane123 --out "${TARGET_APK}" wildtane-aligned.apk"`);

console.log('==> SUCCESS! Built genuine Wildtane APK at:', TARGET_APK);
