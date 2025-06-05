document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const translateBtn = document.getElementById('translate');
    const sourceTextArea = document.getElementById('sourceText');
    const targetTextArea = document.getElementById('targetText');
    const downloadSourceBtn = document.getElementById('downloadSource');
    const downloadTargetBtn = document.getElementById('downloadTarget');
    const downloadAudioBtn = document.getElementById('downloadAudio');
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const sourceLabel = document.getElementById('sourceLabel');
    const targetLabel = document.getElementById('targetLabel');
    const backendStatus = document.getElementById('backendStatus');

    // State variables
    let recognition;
    let mediaRecorder;
    let audioChunks = [];
    let fullSourceText = '';

    // Language code mappings for MyMemory API
    const languageCodeMap = {
        'af-ZA': 'af',  // Afrikaans
        'en-ZA': 'en',  // English
        'nr-ZA': 'nr',  // isiNdebele
        'xh-ZA': 'xh',  // isiXhosa
        'zu-ZA': 'zu',  // isiZulu
        'nso-ZA': 'nso', // Sepedi
        'st-ZA': 'st',  // Sesotho
        'tn-ZA': 'tn',  // Setswana
        'ss-ZA': 'ss',  // siSwati
        've-ZA': 've',  // Tshivenda
        'ts-ZA': 'ts'   // Xitsonga
    };

    // Language display names
    const languageDisplayNames = {
        'af-ZA': 'Afrikaans',
        'en-ZA': 'English',
        'nr-ZA': 'isiNdebele',
        'xh-ZA': 'isiXhosa',
        'zu-ZA': 'isiZulu',
        'nso-ZA': 'Sepedi',
        'st-ZA': 'Sesotho',
        'tn-ZA': 'Setswana',
        'ss-ZA': 'siSwati',
        've-ZA': 'Tshivenda',
        'ts-ZA': 'Xitsonga'
    };

    // Initialize UI
    updateUI();

    // Update UI based on selected languages
    function updateUI() {
        const srcLang = sourceLanguage.value;
        const tgtLang = targetLanguage.value;
        heroTitle.textContent = `SAPS Case Reporter (${languageDisplayNames[srcLang]} to ${languageDisplayNames[tgtLang]})`;
        heroSubtitle.textContent = `Real-time speech transcription and translation from ${languageDisplayNames[srcLang]} to ${languageDisplayNames[tgtLang]} for seamless communication.`;
        sourceLabel.innerHTML = `<span class="emoji">🎧</span> ${languageDisplayNames[srcLang]} Transcript`;
        targetLabel.innerHTML = `<span class="emoji">🌐</span> ${languageDisplayNames[tgtLang]} Translation`;
        downloadSourceBtn.textContent = `Download ${languageDisplayNames[srcLang]} Transcript`;
        downloadTargetBtn.textContent = `Download ${languageDisplayNames[tgtLang]} Translation`;
    }

    // Initialize speech recognition
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = sourceLanguage.value;

            recognition.onresult = (event) => {
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        fullSourceText += transcript + ' '; // Append final transcript instead of resetting
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                sourceTextArea.value = fullSourceText + interimTranscript;
                sourceTextArea.scrollTop = sourceTextArea.scrollHeight; // Auto-scroll to the bottom
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                stopListening();
                alert('Speech recognition error: ' + event.error + '. Your browser may not support speech recognition for this language.');
            };

            recognition.onend = () => {
                if (startBtn.disabled) {
                    startListening();
                }
            };

            return true;
        } else {
            alert('Speech recognition not supported in this browser. Try Chrome or Edge.');
            return false;
        }
    }

    // Translate text using MyMemory API
    function translateText(text) {
        if (!text.trim()) return;
        
        const srcLangCode = languageCodeMap[sourceLanguage.value];
        const tgtLangCode = languageCodeMap[targetLanguage.value];
        const langPair = `${srcLangCode}|${tgtLangCode}`;
        
        targetTextArea.placeholder = 'Translating...';
        
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`)
            .then(res => res.json())
            .then(data => {
                if (data.responseData) {
                    targetTextArea.value = data.responseData.translatedText;
                } else {
                    targetTextArea.value = 'Translation error: No response from server';
                }
                targetTextArea.placeholder = 'Translation';
                targetTextArea.scrollTop = targetTextArea.scrollHeight; // Auto-scroll to the bottom
            })
            .catch(error => {
                console.error('Translation error:', error);
                targetTextArea.value = 'Translation error: ' + error.message;
                targetTextArea.placeholder = 'Translation';
            });
    }

    // Start recording and speech recognition
    function startListening() {
        if (!recognition && !initSpeechRecognition()) {
            return;
        }
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data);
                };
                
                mediaRecorder.start();
                recognition.start();
                
                startBtn.disabled = true;
                stopBtn.disabled = false;
                translateBtn.disabled = true;
                backendStatus.textContent = 'Status: Listening...';
                backendStatus.className = 'online';
            })
            .catch(err => {
                console.error('Microphone access error:', err);
                alert('Could not access microphone. Please ensure you have granted microphone permissions.');
            });
    }

    // Stop recording and speech recognition
    function stopListening() {
        if (recognition) {
            recognition.stop();
        }
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        translateBtn.disabled = !fullSourceText.trim();
        backendStatus.textContent = 'Status: Ready';
    }

    // Language change handlers
    sourceLanguage.addEventListener('change', () => {
        updateUI();
        fullSourceText = '';
        sourceTextArea.value = '';
        targetTextArea.value = '';
        stopListening();
    });

    targetLanguage.addEventListener('change', () => {
        updateUI();
    });

    // Translate button handler
    translateBtn.addEventListener('click', () => {
        if (fullSourceText.trim()) {
            translateText(fullSourceText);
        }
    });

    // Download handlers
    downloadSourceBtn.addEventListener('click', () => {
        downloadText(sourceTextArea.value, `${languageDisplayNames[sourceLanguage.value].toLowerCase()}_transcript.txt`);
    });

    downloadTargetBtn.addEventListener('click', () => {
        downloadText(targetTextArea.value, `${languageDisplayNames[targetLanguage.value].toLowerCase()}_translation.txt`);
    });

    downloadAudioBtn.addEventListener('click', () => {
        if (audioChunks.length > 0) {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recording.webm';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            alert('No audio recorded yet!');
        }
    });

    // Helper function to download text
    function downloadText(content, filename) {
        if (!content.trim()) {
            alert('No content to download!');
            return;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Event listeners for buttons
    startBtn.addEventListener('click', startListening);
    stopBtn.addEventListener('click', stopListening);

    // Initialize backend status
    backendStatus.textContent = 'Status: Ready';
    backendStatus.className = 'online';
});
