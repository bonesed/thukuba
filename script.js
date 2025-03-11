// Dify API設定
const DIFY_API_ENDPOINT = 'https://api.dify.ai/v1';
const DIFY_API_KEY = 'app-QXDuUVWKmRpJvmVOTi6LVKNI'; // 実際のAPIキーに置き換える
const CONVERSATION_API = `${DIFY_API_ENDPOINT}/chat-messages`;

// 言語設定
const languages = {
    'ja': {
        apiLanguage: 'ja',
        placeholder: '質問を入力してください...',
        sendButton: '送信',
        quickQuestions: [
            '観光スポットは？',
            '交通手段は？',
            'おすすめグルメは？',
            '今日のイベントは？'
        ],
        headerTitle: 'つくば市観光案内チャットボット',
        logoText: 'つくば<br>観光',
        mapText: 'ここに地図が表示されます',
        accessInfo: 'アクセス情報',
        welcomeMessage: 'こんにちは！つくば市観光案内AIアシスタントです。つくば市での観光、交通、食事、イベントなど、どんなことでもお気軽にお尋ねください。',
        errorMessage: 'すみません、エラーが発生しました。もう一度お試しください。',
        loadingMessage: '回答を考えています...'
    },
    'en': {
        apiLanguage: 'en',
        placeholder: 'Enter your question...',
        sendButton: 'Send',
        quickQuestions: [
            'Tourist Spots?',
            'Transportation?',
            'Recommended Food?',
            "Today's Events?"
        ],
        headerTitle: 'Tsukuba City Tourism Guide',
        logoText: 'Tsukuba<br>Guide',
        mapText: 'Map will be displayed here',
        accessInfo: 'Access Information',
        welcomeMessage: "Hello! I'm the Tsukuba City tourism AI assistant. Please feel free to ask me about sightseeing, transportation, food, events, or anything else in Tsukuba City.",
        errorMessage: 'Sorry, an error occurred. Please try again.',
        loadingMessage: 'Thinking...'
    }
};

// 現在の言語と会話ID
let currentLanguage = 'ja';
let currentConversationId = null;
let map = null;
let markers = [];

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', function() {
    // 言語切り替えボタンのイベントリスナー設定
    setupLanguageToggle();
    
    // クイック質問ボタンのイベントリスナー設定
    setupQuickQuestions();
    
    // 送信ボタンのイベントリスナー設定
    setupSendButton();
    
    // 音声入力の設定（対応ブラウザのみ）
    setupVoiceInput();
    
    // 入力フィールドのEnterキー対応
    setupInputField();
    
    // 自動リセット機能（デジタルサイネージ用）
    setupAutoReset();
    
    // Google Maps APIが読み込まれている場合は初期化
    if (typeof google !== 'undefined' && google.maps) {
        initMap();
    }
});

// 言語切り替え機能の設定
function setupLanguageToggle() {
    document.querySelectorAll('.lang-btn').forEach(button => {
        button.addEventListener('click', function() {
            const isEnglish = this.textContent === 'English';
            
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            switchLanguage(isEnglish ? 'en' : 'ja');
        });
    });
}

// 言語切り替え処理
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // テキスト要素の更新
    document.querySelector('.text-input').placeholder = languages[lang].placeholder;
    document.querySelector('.input-btn:last-child').textContent = languages[lang].sendButton;
    document.querySelector('h1').textContent = languages[lang].headerTitle;
    document.querySelector('.logo').innerHTML = languages[lang].logoText;
    
    // 地図がすでに初期化されていない場合のみテキストを設定
    if (!map) {
        document.querySelector('.map-container').textContent = languages[lang].mapText;
    }
    
    document.querySelector('.quick-info h3').textContent = languages[lang].accessInfo;
    
    // クイック質問ボタンの更新
    const questionBtns = document.querySelectorAll('.question-btn');
    languages[lang].quickQuestions.forEach((text, index) => {
        if (questionBtns[index]) {
            questionBtns[index].textContent = text;
        }
    });
    
    // 新しい会話を開始
    startNewConversation();
}

// クイック質問ボタンの設定
function setupQuickQuestions() {
    document.querySelectorAll('.question-btn').forEach(button => {
        button.addEventListener('click', function() {
            const question = this.textContent;
            sendUserMessage(question);
        });
    });
}

// 送信ボタンの設定
function setupSendButton() {
    document.querySelector('.input-btn:last-child').addEventListener('click', function() {
        sendCurrentInputMessage();
    });
}

// 入力フィールドのEnterキー対応設定
function setupInputField() {
    const inputField = document.querySelector('.text-input');
    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendCurrentInputMessage();
        }
    });
}

// 音声入力の設定
function setupVoiceInput() {
    const voiceBtn = document.querySelector('.voice-btn');
    
    // SpeechRecognition APIのサポートチェック
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // 言語の設定（現在の選択言語による）
        recognition.lang = currentLanguage === 'ja' ? 'ja-JP' : 'en-US';
        recognition.interimResults = false;
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.querySelector('.text-input').value = transcript;
            // 音声認識結果を自動送信
            setTimeout(() => sendCurrentInputMessage(), 500);
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            voiceBtn.classList.remove('active');
        };
        
        recognition.onend = function() {
            voiceBtn.classList.remove('active');
        };
        
        voiceBtn.addEventListener('click', function() {
            // 言語の更新（言語が切り替えられた場合に対応）
            recognition.lang = currentLanguage === 'ja' ? 'ja-JP' : 'en-US';
            recognition.start();
            voiceBtn.classList.add('active');
            
            // 10秒後に自動停止（タイムアウト対策）
            setTimeout(() => {
                if (voiceBtn.classList.contains('active')) {
                    recognition.stop();
                }
            }, 10000);
        });
    } else {
        // 音声認識非対応の場合はボタンを非表示
        voiceBtn.style.display = 'none';
    }
}

// 自動リセット機能設定（デジタルサイネージ向け）
function setupAutoReset() {
    // ユーザーのアクティビティを検出する変数
    let userActivityTimeout;
    const resetTimeInMinutes = 5; // 5分間操作がなければリセット
    
    // アクティビティを検出する関数
    function detectActivity() {
        clearTimeout(userActivityTimeout);
        userActivityTimeout = setTimeout(() => {
            startNewConversation();
        }, resetTimeInMinutes * 60 * 1000);
    }
    
    // 様々なユーザーイベントを監視
    ['click', 'touchstart', 'keypress'].forEach(eventType => {
        document.addEventListener(eventType, detectActivity);
    });
    
    // 初期タイマーセット
    detectActivity();
}

// 現在の入力メッセージを送信
function sendCurrentInputMessage() {
    const input = document.querySelector('.text-input');
    const message = input.value.trim();
    
    if (message) {
        sendUserMessage(message);
        input.value = '';
    }
}

// ユーザーメッセージの送信と表示
function sendUserMessage(message) {
    // UIにユーザーメッセージを表示
    displayMessage(message, false);
    
    // APIにメッセージを送信
    sendToAPI(message);
}

// APIにメッセージを送信
async function sendToAPI(message) {
    // ローディングインジケーターを表示
    displayLoadingIndicator();
    
    try {
        const response = await fetch(CONVERSATION_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DIFY_API_KEY}`
            },
            body: JSON.stringify({
                inputs: {},
                query: message,
                user: 'tourist-kiosk',
                response_mode: 'blocking', // または 'streaming'
                conversation_id: currentConversationId
            })
        });
        
        // ローディングインジケーターを削除
        removeLoadingIndicator();
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 会話IDを保存（初回の場合）
        if (!currentConversationId && data.conversation_id) {
            currentConversationId = data.conversation_id;
        }
        
        // APIからの応答を表示
        displayMessage(data.answer, true);
        
        // 回答内容に基づいて地図と情報パネルを更新
        updateInfoPanelFromAPIResponse(data.answer);
        
    } catch (error) {
        console.error('Error:', error);
        removeLoadingIndicator();
        
        // エラーメッセージを表示
        displayMessage(languages[currentLanguage].errorMessage, true);
    }
}

// ローディングインジケーターの表示
function displayLoadingIndicator() {
    const chatMessages = document.querySelector('.chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'bot-message', 'loading-message');
    loadingDiv.innerHTML = `
        <div class="loading-text">${languages[currentLanguage].loadingMessage}</div>
        <div class="loading-dots"><span></span><span></span><span></span></div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ローディングインジケーターの削除
function removeLoadingIndicator() {
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// メッセージ表示機能
function displayMessage(message, isBot) {
    const chatMessages = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isBot ? 'bot-message' : 'user-message');
    
    // メッセージテキストの処理（リンクや強調などを含む）
    messageDiv.innerHTML = processMessageText(message);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// メッセージテキストの処理
function processMessageText(text) {
    // URLをクリック可能なリンクに変換
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // 改行をHTMLの改行に変換
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// 新しい会話を開始する関数
function startNewConversation() {
    currentConversationId = null;
    document.querySelector('.chat-messages').innerHTML = '';
    displayMessage(languages[currentLanguage].welcomeMessage, true);
    
    // 地図をリセット
    if (map) {
        resetMap();
    } else if (typeof google !== 'undefined' && google.maps) {
        // マップが初期化されていなければ初期化
        initMap();
    }
    
    // 情報パネルをリセット
    resetInfoPanel();
}

// 情報パネルのリセット
function resetInfoPanel() {
    const infoList = document.querySelector('.info-list');
    infoList.innerHTML = '';
    
    document.querySelector('.quick-info h3').textContent = 
        currentLanguage === 'ja' ? 'アクセス情報' : 'Access Information';
}

// 地図の初期化
function initMap() {
    // つくば市センターの座標
    const tsukubaCenter = { lat: 36.0834, lng: 140.1121 };
    
    // 地図コンテナ要素の取得
    const mapElement = document.querySelector('.map-container');
    
    // テキストコンテンツをクリア
    mapElement.textContent = '';
    
    // 地図の初期化
    map = new google.maps.Map(mapElement, {
        center: tsukubaCenter,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true
    });
    
    // デフォルトのマーカー
    addMarker(tsukubaCenter, 'つくばセンター');
}

// 地図マーカーの追加
function addMarker(position, title) {
    if (!map) return;
    
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: title
    });
    
    markers.push(marker);
    return marker;
}

// 全マーカーの削除
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// 地図のリセット
function resetMap() {
    if (!map) return;
    
    // つくば市センターの座標
    const tsukubaCenter = { lat: 36.0834, lng: 140.1121 };
    
    // 地図の中心とズームをリセット
    map.setCenter(tsukubaCenter);
    map.setZoom(13);
    
    // マーカーをクリア
    clearMarkers();
    
    // デフォルトのマーカーを追加
    addMarker(tsukubaCenter, 'つくばセンター');
}

// APIレスポンスから情報パネルを更新
function updateInfoPanelFromAPIResponse(answer) {
    // 回答内容から場所や情報タイプを抽出
    const lowerAnswer = answer.toLowerCase();
    
    // JAXAに関する回答
    if (lowerAnswer.includes('jaxa') || lowerAnswer.includes('宇宙センター') || lowerAnswer.includes('space center')) {
        updateInfoPanel('JAXA');
        updateMapForLocation('JAXA');
    } 
    // エキスポセンターに関する回答
    else if (lowerAnswer.includes('エキスポ') || lowerAnswer.includes('科学館') || lowerAnswer.includes('expo center')) {
        updateInfoPanel('エキスポ');
        updateMapForLocation('エキスポ');
    } 
    // 交通情報に関する回答
    else if (lowerAnswer.includes('交通') || lowerAnswer.includes('バス') || lowerAnswer.includes('電車') || 
             lowerAnswer.includes('transport') || lowerAnswer.includes('bus') || lowerAnswer.includes('train')) {
        updateInfoPanel('交通');
        updateMapForLocation('交通');
    } 
    // 飲食に関する回答
    else if (lowerAnswer.includes('グルメ') || lowerAnswer.includes('レストラン') || lowerAnswer.includes('食事') || 
             lowerAnswer.includes('restaurant') || lowerAnswer.includes('food') || lowerAnswer.includes('eat')) {
        updateInfoPanel('グルメ');
        updateMapForLocation('グルメ');
    } 
    // イベントに関する回答
    else if (lowerAnswer.includes('イベント') || lowerAnswer.includes('祭り') || lowerAnswer.includes('event') || lowerAnswer.includes('festival')) {
        updateInfoPanel('イベント');
        updateMapForLocation('イベント');
    }
    // 他の場所も追加可能
}

// 場所に応じた地図の更新
function updateMapForLocation(locationType) {
    if (!map) return;
    
    // 場所ごとの座標情報
    const locations = {
        'JAXA': { 
            center: { lat: 36.0522, lng: 140.1223 }, 
            title: 'JAXAつくば宇宙センター',
            zoom: 15
        },
        'エキスポ': { 
            center: { lat: 36.0836, lng: 140.1107 }, 
            title: 'つくばエキスポセンター',
            zoom: 15
        },
        '交通': { 
            center: { lat: 36.0834, lng: 140.1121 }, 
            title: 'つくばセンター（バスターミナル）',
            zoom: 14
        },
        'グルメ': { 
            center: { lat: 36.0834, lng: 140.1121 }, 
            title: 'つくばセンター周辺飲食店',
            zoom: 15
        },
        'イベント': { 
            center: { lat: 36.0860, lng: 140.1111 }, 
            title: 'つくば中央公園',
            zoom: 15
        }
    };
    
    const location = locations[locationType];
    if (location && map) {
        // 地図の中心とズームを更新
        map.setCenter(location.center);
        map.setZoom(location.zoom);
        
        // 既存のマーカーをクリア
        clearMarkers();
        
        // 新しいマーカーを追加
        addMarker(location.center, location.title);
    }
}

// 情報パネルの更新
function updateInfoPanel(type) {
    const infoList = document.querySelector('.info-list');
    const infoTitle = document.querySelector('.quick-info h3');
    
    // パネルをクリア
    infoList.innerHTML = '';
    
    // 場所タイプに応じた情報を設定
    if (type === 'JAXA') {
        infoTitle.textContent = currentLanguage === 'ja' ? 'JAXAつくば宇宙センター' : 'JAXA Tsukuba Space Center';
        
        if (currentLanguage === 'ja') {
            addInfoItem(infoList, '住', '茨城県つくば市千現2-1-1');
            addInfoItem(infoList, '営', '10:00～17:00（入場は16:30まで）');
            addInfoItem(infoList, '休', '年末年始、施設点検日（原則月曜）');
            addInfoItem(infoList, '料', '無料（展示館）');
            addInfoItem(infoList, '交', 'つくばエクスプレスつくば駅からバスで約20分');
        } else {
            addInfoItem(infoList, 'Ad', '2-1-1 Sengen, Tsukuba, Ibaraki');
            addInfoItem(infoList, 'Op', '10:00-17:00 (Last entry 16:30)');
            addInfoItem(infoList, 'Cl', 'New Year holidays, maintenance days');
            addInfoItem(infoList, 'Fe', 'Free (Exhibition Hall)');
            addInfoItem(infoList, 'Ac', 'About 20 min by bus from Tsukuba Station');
        }
    } 
    else if (type === 'エキスポ') {
        infoTitle.textContent = currentLanguage === 'ja' ? 'つくばエキスポセンター' : 'Tsukuba Expo Center';
        
        if (currentLanguage === 'ja') {
            addInfoItem(infoList, '住', '茨城県つくば市吾妻2-9');
            addInfoItem(infoList, '営', '9:30～17:00（入場は16:30まで）');
            addInfoItem(infoList, '休', '月曜（祝日の場合は翌日）、年末年始');
            addInfoItem(infoList, '料', '大人410円、小人210円');
            addInfoItem(infoList, '交', 'つくばセンターから徒歩5分');
        } else {
            addInfoItem(infoList, 'Ad', '2-9 Azuma, Tsukuba, Ibaraki');
            addInfoItem(infoList, 'Op', '9:30-17:00 (Last entry 16:30)');
            addInfoItem(infoList, 'Cl', 'Mondays, New Year holidays');
            addInfoItem(infoList, 'Fe', 'Adults 410 yen, Children 210 yen');
            addInfoItem(infoList, 'Ac', '5 min walk from Tsukuba Center');
        }
    }
    else if (type === '交通') {
        infoTitle.textContent = currentLanguage === 'ja' ? '交通情報' : 'Transportation';
        
        if (currentLanguage === 'ja') {
            addInfoItem(infoList, '電', 'つくばエクスプレス：秋葉原からつくば駅まで最速45分');
            addInfoItem(infoList, 'バ', 'つくばセンターから市内各所へバス運行');
            addInfoItem(infoList, '自', 'つくばセンターでレンタサイクル利用可能（1日300円）');
            addInfoItem(infoList, '車', '常磐自動車道 桜土浦ICからつくば中心部まで約15分');
        } else {
            addInfoItem(infoList, 'Tr', 'Tsukuba Express: 45 min from Akihabara to Tsukuba');
            addInfoItem(infoList, 'Bu', 'Buses operate from Tsukuba Center to various areas');
            addInfoItem(infoList, 'Bi', 'Bicycle rental available at Tsukuba Center (300 yen/day)');
            addInfoItem(infoList, 'Ca', 'About 15 min from Sakura-Tsuchiura IC on Joban Expressway');
        }
    }
    else if (type === 'グルメ') {
        infoTitle.textContent = currentLanguage === 'ja' ? 'グルメ情報' : 'Dining Information';
        
        if (currentLanguage === 'ja') {
            addInfoItem(infoList, '洋', 'つくばクレオスクエア：イタリアン、フレンチなど');
            addInfoItem(infoList, '和', 'BiVi つくば：和食、寿司、うどん、そば');
            addInfoItem(infoList, '中', 'つくばセンター周辺：中華料理、ラーメン');
            addInfoItem(infoList, 'カ', 'デイズタウン：カフェ、スイーツ');
        } else {
            addInfoItem(infoList, 'We', 'Tsukuba Creo Square: Italian, French cuisine');
            addInfoItem(infoList, 'Ja', 'BiVi Tsukuba: Japanese cuisine, sushi, udon, soba');
            addInfoItem(infoList, 'Ch', 'Around Tsukuba Center: Chinese cuisine, ramen');
            addInfoItem(infoList, 'Ca', 'Days Town: Cafes, sweets');
        }
    }
    else if (type === 'イベント') {
        infoTitle.textContent = currentLanguage === 'ja' ? 'イベント情報' : 'Event Information';
        
        if (currentLanguage === 'ja') {
            addInfoItem(infoList, '春', 'つくばフェスティバル（5月）：つくば中央公園');
            addInfoItem(infoList, '夏', 'まつりつくば（8月）：つくばセンター周辺');
            addInfoItem(infoList, '秋', '研究機関一般公開（10-11月）：各研究機関');
            addInfoItem(infoList, '冬', 'つくばスターライトファンタジー（12月）：つくばセンター');
        } else {
            addInfoItem(infoList, 'Sp', 'Tsukuba Festival (May): Tsukuba Central Park');
            addInfoItem(infoList, 'Su', 'Matsuri Tsukuba (August): Around Tsukuba Center');
            addInfoItem(infoList, 'Fa', 'Research Institutes Open House (Oct-Nov): Various locations');
            addInfoItem(infoList, 'Wi', 'Tsukuba Starlight Fantasy (December): Tsukuba Center');
        }
    }
}

// 情報アイテムの追加
function addInfoItem(container, icon, text) {
    const item = document.createElement('div');
    item.classList.add('info-item');
    
    const iconSpan = document.createElement('div');
    iconSpan.classList.add('info-icon');
    iconSpan.textContent = icon;
    
    const textSpan = document.createElement('div');
    textSpan.textContent = text;
    
    item.appendChild(iconSpan);
    item.appendChild(textSpan);
    container.appendChild(item);
}

// シンプルなUUID生成関数（会話IDがAPIから返されない場合用）
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}