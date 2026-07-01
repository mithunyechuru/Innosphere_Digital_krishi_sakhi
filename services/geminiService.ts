
import { GoogleGenAI, Type } from "@google/genai";
import { Message, Language, UserProfile, WeatherData, CropRecommendation } from '../types';

const rawKey = process.env.API_KEY || "DUMMY_KEY";
const cleanedKey = rawKey.replace(/^["']|["']$/g, "").trim();
const ai = new GoogleGenAI({ apiKey: cleanedKey });

// System instructions for the Agri-Expert
const getSystemInstruction = (lang: Language) => {
  const instructions = {
    [Language.ENGLISH]: "You are Krishi Sakhi, an expert agricultural companion for Indian farmers. Answer questions about crops, pests, weather, and market prices simply and concisely. Keep answers under 100 words. Use emojis where helpful. IMPORTANT: Always respond in English.",
    [Language.HINDI]: "आप कृषि सखी हैं, भारतीय किसानों के लिए एक विशेषज्ञ कृषि साथी। फसलों, कीटों, मौसम और बाजार मूल्यों के बारे में सवालों के जवाब सरलता और संक्षेप में दें। उत्तर 100 शब्दों से कम रखें। महत्वपूर्ण: हमेशा हिंदी में उत्तर दें।",
    [Language.MARATHI]: "तुम्ही कृषी सखी आहात, भारतीय शेतकऱ्यांसाठी तज्ञ कृषी सोबती. पिके, कीटक, हवामान आणि बाजारभावाविषयीच्या प्रश्नांची उत्तरे सोप्या आणि थोडक्यात द्या. उत्तरे १०० शब्दांपेक्षा कमी ठेवा. महत्वाचे: नेहमी मराठीत उत्तर द्या.",
    [Language.TELUGU]: "మీరు కృషి సఖి, భారతೀಯ రైతుల కోసం వ్యవసాయ నిపుణులు. పంటలు, తెగుళ్లు, వాతావరణం మరియు మార్కెట్ ధరల గురించిన ప్రశ్నలకు సరళంగా మరియు క్లుప్తంగా సమాధానం ఇవ్వండి. సమాధానాలను 100 పదాల లోపు ఉంచండి. అవసరమైన చోట ఎమోజీలను ఉపయోగించండి. ముఖ్యం: ఎల్లప్పుడూ తెలుగులో సమాధానం ఇవ్వండి.",
    [Language.TAMIL]: "நீங்கள் கிருஷி சகி, இந்திய விவசாயிகளுக்கான வேளாண்மை நிபுணர். பயிர்கள், பூச்சிகள், வானிலை மற்றும் சந்தை விலைகள் பற்றிய கேள்விகளுக்கு எளிமையாகவும் சுருக்கமாகவும் பதிலளிக்கவும். பதில்களை 100 வார்த்தைகளுக்குள் வைத்திருங்கள். முக்கியம்: எப்போதும் தமிழில் பதிலளிக்கவும்.",
    [Language.KANNADA]: "ನೀವು ಕೃಷಿ ಸಖಿ, ಭಾರತೀಯ ರೈತರಿಗೆ ತಜ್ಞ ಕೃಷಿ ಸಹಚರರು. ಬೆಳೆಗಳು, ಕೀಟಗಳು, ಹವಾಮಾನ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳಿಗೆ ಸರಳವಾಗಿ ಮತ್ತು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಉತ್ತರಿಸಿ. ಉತ್ತರಗಳನ್ನು 100 ಪದಗಳಿಗಿಂತ ಕಡಿಮೆ ಇರಿಸಿ. ಪ್ರಮುಖ: ಯಾವಾಗಲೂ ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ.",
    [Language.MALAYALAM]: "നിങ്ങൾ ഇന്ത്യൻ കർഷകർക്കുള്ള വിദഗ്ധ കാർഷിക കൂട്ടുകാരനായ കൃഷി സഖിയാണ്. വിളകൾ, കീടങ്ങൾ, കാലാവസ്ഥ, വിപണി വിലകൾ എന്നിവയെക്കുറിച്ചുള്ള ചോദ്യങ്ങൾക്ക് ലളിതമായും സംക്ഷിപ്തമായും ഉത്തരം നൽകുക. ഉത്തരങ്ങൾ 100 വാക്കുകളിൽ താഴെയായി സൂക്ഷിക്കുക. പ്രധാനം: എപ്പോഴും മലയാളത്തിൽ മറുപടി നൽകുക."
  };
  return instructions[lang];
};

const getLanguageName = (lang: Language) => {
  switch(lang) {
    case Language.ENGLISH: return "English";
    case Language.HINDI: return "Hindi";
    case Language.MARATHI: return "Marathi";
    case Language.TELUGU: return "Telugu";
    case Language.TAMIL: return "Tamil";
    case Language.KANNADA: return "Kannada";
    case Language.MALAYALAM: return "Malayalam";
    default: return "English";
  }
};

export const sendChatMessage = async (
  message: string, 
  history: Message[], 
  language: Language
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = getSystemInstruction(language);
    
    // Explicitly enforce language in the prompt to prevent the model from drifting
    const langName = getLanguageName(language);
    const enforcedMessage = `${message} (Please answer strictly in ${langName})`;

    // Find the first user message to ensure history starts with a user turn
    const firstUserIndex = history.findIndex(msg => msg.sender === 'user');
    const cleanedHistory = firstUserIndex !== -1 ? history.slice(firstUserIndex) : [];

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction,
      },
      history: cleanedHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    });

    const result = await chat.sendMessage({ message: enforcedMessage });
    return result.text || "Sorry, I could not understand. Please try again.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I am currently offline or experiencing issues. Please check your connection.";
  }
};

export const analyzePlantImage = async (base64Image: string, mimeType: string, language: Language, cropName?: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const getPrompt = (lang: Language, crop: string | undefined) => {
      const cropContext = crop ? `The user identified this crop as: ${crop}.` : "";
      
      const prompts = {
        [Language.ENGLISH]: `Analyze this image.${cropContext} If it shows a plant, identify the crop and the disease/pest. 
        Provide a detailed and easy-to-understand report for a farmer. Explain the symptoms clearly so the farmer can understand the issue from a basic level.
        
        Format exactly as follows. STRICTLY use bold **text** ONLY for the specific side headings listed below. Do NOT use bold for the content text.
        
        **Disease Name:** [Name of disease/pest]
        
        **Understanding the Issue:**
        [Elaborate on the symptoms, visual signs, and why this happens in simple terms. Make it educational. Do not use bold text here.]
        
        **--- REMEDIES ---**
        
        **Organic Control:**
        [Detailed organic remedy steps. Do not use bold text here.]
        
        **Chemical Control:**
        [Name of chemical. IMPORTANT: Specify exact dosage per 1 acre (e.g., Mix 200ml in 200L water for 1 acre). Be accurate. Do not use bold text here.]
        
        If it is not a plant, say 'Not a plant'.`,

        [Language.HINDI]: `इस छवि का विश्लेषण करें। ${crop ? `फसल: ${crop}।` : ""} यदि यह पौधा है, तो बीमारी की पहचान करें।
        किसान के लिए विस्तृत रिपोर्ट दें। लक्षणों को स्पष्ट रूप से समझाएं।
        
        सटीक प्रारूप का पालन करें। केवल नीचे दिए गए शीर्षकों के लिए **बोल्ड** टेक्स्ट का प्रयोग करें। विवरण के लिए सामान्य टेक्स्ट का उपयोग करें।
        
        **बीमारी का नाम:** [नाम]
        
        **समस्या को समझें:**
        [लक्षणों और कारणों का सरल विवरण। सामान्य टेक्स्ट।]
        
        **--- उपाय (REMEDIES) ---**
        
        **जैविक उपाय:**
        [विशिष्ट जैविक उपाय। सामान्य टेक्स्ट।]
        
        **रासायनिक उपाय:**
        [रसायन का नाम और 1 एकड़ के लिए सटीक खुराक। सामान्य टेक्स्ट।]
        
        यदि पौधा नहीं है, तो लिखें 'पौधा नहीं है'।`,

        [Language.MARATHI]: `या प्रतिमेचे विश्लेषण करा. ${crop ? `पीक: ${crop}.` : ""} जर ही वनस्पती असेल, तर रोग ओळखा.
        शेतकऱ्यासाठी सविस्तर अहवाल द्या.
        
        फक्त खालील शीर्षकांसाठी **ठळक** (Bold) मजकूर वापरा. बाकी माहिती सामान्य मजकुरात ठेवा.
        
        **रोगाचे नाव:** [नाव]
        
        **समस्या समजून घ्या:**
        [लक्षणे आणि कारणांचे साध्या शब्दांत वर्णन. सामान्य मजकूर.]
        
        **--- उपाय (REMEDIES) ---**
        
        **सेंद्रिय उपाय:**
        [विशिष्ट सेंद्रिय उपाय. सामान्य मजकूर.]
        
        **रासायनिक उपाय:**
        [रसायनाचे नाव आणि 1 एकरासाठी अचूक डोस. सामान्य मजकूर.]
        
        जर वनस्पती नसेल, तर 'वनस्पती नाही' असे लिहा.`,

        [Language.TELUGU]: `ఈ చిత్రాన్ని విశ్లేషించండి. ${crop ? `పంట: ${crop}.` : ""} ఇది మొక్క అయితే, వ్యాధిని గుర్తించండి.
        రైతుకు అర్థమయ్యేలా నివేదిక ఇవ్వండి.
        
        ఖచ్చితమైన ఫార్మాట్ పాటించండి. కేవలం ఈ శీర్షికలకు మాత్రమే **బోల్డ్** (Bold) ఉపయోగించండి. మిగిలినవి సాధారణ వచనంలో ఉండాలి.
        
        **వ్యాధి పేరు:** [పేరు]
        
        **సమస్యను అర్థం చేసుకోండి:**
        [లక్షణాలు మరియు కారణాల వివరణ. సాధారణ వచనం.]
        
        **--- పరిష్కారాలు (REమీడీయస్) ---**
        
        **సేంద్రీయ నివారణ:**
        [సేంద్రీయ పరిష్కారం. సాధారణ వచనం.]
        
        **రసాయన నివారణ:**
        [రసాయన పేరు మరియు 1 ఎకరానికి మోతాదు. సాధారణ వచనం.]
        
        మొక్క కాకపోతే, 'మొక్క కాదు' అని రాయండి.`,

        [Language.TAMIL]: `இந்த படத்தை பகுப்பாய்வு செய்யுங்கள். ${crop ? `பயிர்: ${crop}.` : ""} இது தாவரமாக இருந்தால், நோயைக் கண்டறியவும்.
        விவசாயிக்கு புரியும்படி விரிவான அறிக்கை தாருங்கள்.
        
        சரியான வடிவத்தைப் பின்பற்றவும். கீழே உள்ள தலைப்புகளுக்கு மட்டுமே **தடித்த** (Bold) எழுத்துக்களைப் பயன்படுத்தவும். மற்றவை சாதாரண உரையாக இருக்க வேண்டும்.
        
        **நோய் பெயர்:** [பெயர்]
        
        **பிரச்சினையைப் புரிந்துகொள்ளுதல்:**
        [அறிகுறிகள் மற்றும் காரணங்களின் விளக்கம். சாதாரண உரை.]
        
        **--- தீர்வுகள் (REMEDIES) ---**
        
        **இயற்கை முறை:**
        [இயற்கை வழி தீர்வு. சாதாரண உரை.]
        
        **ரசாயன முறை:**
        [ரசாயனத்தின் பெயர் மற்றும் 1 ஏக்கருக்கான அளவு. சாதாரண உரை.]
        
        தாவரம் இல்லையென்றால், 'தாவரம் இல்லை' என்று எழுதவும்.`,

        [Language.KANNADA]: `ಈ ಚಿತ್ರವನ್ನು ವಿಶ್ಲೇಷಿಸಿ. ${crop ? `ಬೆಳೆ: ${crop}.` : ""} ಇದು ಸಸ್ಯವಾಗಿದ್ದರೆ, ರೋಗವನ್ನು ಗುರುತಿಸಿ.
        ರೈತರಿಗೆ ಅರ್ಥವಾಗುವಂತೆ ವರದಿ ನೀಡಿ.
        
        ನಿಖರವಾದ ಸ್ವರೂಪವನ್ನು ಅನುಸರಿಸಿ. ಕೆಳಗಿನ ಶೀರ್ಷಿಕೆಗಳಿಗೆ ಮಾತ್ರ **ದಪ್ಪ** (Bold) ಪಠ್ಯವನ್ನು ಬಳಸಿ. ಉಳಿದವು ಸಾಮಾನ್ಯ ಪಠ್ಯವಾಗಿರಲಿ.
        
        **ರೋಗದ ಹೆಸರು:** [ಹೆಸರು]
        
        **ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ:**
        [ಲಕ್ಷಣಗಳು ಮತ್ತು ಕಾರಣಗಳ ವಿವರಣೆ. ಸಾಮಾನ್ಯ ಪಠ್ಯ.]
        
        **--- ಪರಿಹಾರಗಳು (REMEDIES) ---**
        
        **ಸಾವಯವ ನಿಯಂತ್ರಣ:**
        [ಸಾವಯವ ಪರಿಹಾರ. ಸಾಮಾನ್ಯ ಪಠ್ಯ.]
        
        **ರಾಸಾಯನಿಕ ನಿಯಂತ್ರಣ:**
        [ರಾಸಾಯನಿಕ ಹೆಸರು ಮತ್ತು 1 ಎಕರೆಗೆ ಡೋಸೇಜ್. ಸಾಮಾನ್ಯ ಪಠ್ಯ.]
        
        ಸಸ್ಯವಲ್ಲದಿದ್ದರೆ, 'ಸಸ್ಯವಲ್ಲ' ಎಂದು ಬರೆಯಿರಿ.`,

        [Language.MALAYALAM]: `ഈ ചിത്രം വിശകലനം ചെയ്യുക. ${crop ? `വിള: ${crop}.` : ""} ഇതൊരു ചെടിയാണെങ്കിൽ, രോഗം തിരിച്ചറിയുക.
        കർഷകന് മനസ്സിലാകുന്ന രീതിയിൽ റിപ്പോർട്ട് നൽകുക.
        
        കൃത്യമായ ഫോർമാറ്റ് പിന്തുടരുക. താഴെയുള്ള തലക്കെട്ടുകൾക്ക് മാത്രം **ബോൾഡ്** (Bold) ഉപയോഗിക്കുക. ബാക്കിയുള്ളവ സാധാരണ വാചകമായിരിക്കണം.
        
        **രോഗത്തിന്റെ പേര്:** [പേര്]
        
        **പ്രശ്നം മനസ്സിലാക്കുക:**
        [ലക്ഷണങ്ങളുടെയും കാരണങ്ങളുടെയും വിശദീകരണം. സാധാരണ വാചകം.]
        
        **--- പരിഹാരങ്ങൾ (REMEDIES) ---**
        
        **ജൈവ നിയന്ത്രണം:**
        [ജൈവ പരിഹാരം. സാധാരണ വാചകം.]
        
        **രാസ നിയന്ത്രണം:**
        [രാസവസ്തുവിന്റെ പേരും 1 ഏക്കറിനുള്ള അളവും. സാധാരണ വാചകം.]
        
        ചെടിയല്ലെങ്കിൽ, 'ചെടിയല്ല' എന്ന് എഴുതുക.`
      };
      
      return prompts[lang] || prompts[Language.ENGLISH];
    };

    const prompt = getPrompt(language, cropName);

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      }
    });

    return response.text || "Analysis failed. Please try again.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return "Unable to analyze image at the moment. Please check your internet connection.";
  }
};

export const generateCropRecommendations = async (user: UserProfile, weather: WeatherData): Promise<CropRecommendation[]> => {
  try {
    const model = 'gemini-2.5-flash';
    const langName = getLanguageName(user.language);
    
    // Construct context
    const context = {
        location: user.location.city,
        soil: user.farmDetails?.soilType || "General",
        irrigation: user.farmDetails?.irrigation || "Rainfed",
        farmSize: `${user.farmDetails?.size} ${user.farmDetails?.unit}`,
        weather: {
            temp: weather.temperature,
            condition: weather.condition,
            rain: weather.isRainy ? "Yes" : "No"
        },
        month: new Date().toLocaleString('default', { month: 'long' }),
        language: user.language
    };

    const prompt = `
        Acting as an expert agronomist for a farm in ${context.location} (Soil: ${context.soil}, Irrigation: ${context.irrigation}, Month: ${context.month}).
        Current weather: ${context.weather.temp}°C, ${context.weather.condition}.
        
        Suggest 3 most suitable crops to plant RIGHT NOW.
        
        CRITICAL: All text content in the JSON (cropName, reason, stage, activity, description) MUST be translated to ${langName}.
        
        Return a JSON array with exactly this structure:
        [
            {
                "cropName": "Name of crop in ${langName}",
                "suitabilityScore": 85, (integer 0-100)
                "reason": "One sentence why this is good now in ${langName}.",
                "durationDays": 120, (integer approx total duration)
                "timeline": [
                    { "day": 1, "stage": "Stage Name in ${langName}", "activity": "Activity Name in ${langName}", "description": "Description in ${langName}" },
                    { "day": 15, "stage": "Stage Name in ${langName}", "activity": "Activity Name in ${langName}", "description": "Description in ${langName}" },
                    ... (Provide 5-6 key milestones up to harvest)
                ]
            }
        ]
        
        IMPORTANT: Return ONLY the JSON string. Do not use markdown code blocks or explanations.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const text = response.text || "[]";
    // Sanitize and parse
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Recommendation Error", error);
    return [];
  }
};

export const analyzeSoilHealthCard = async (base64Image: string, mimeType: string, language: Language): Promise<string> => {
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `
            Analyze this Soil Health Card image. Extract key nutrient values (N, P, K, pH, OC) if visible.
            Based on the values, provide a summary recommendation for fertilizer application and soil amendments.
            
            Response Language: ${language}
            Format: Markdown (Use headings).
            Keep it simple for a farmer.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: prompt }
                ]
            }
        });

        return response.text || "Could not analyze the card.";
    } catch (error) {
        console.error("Soil Card Analysis Error", error);
        return "Error analyzing card.";
    }
};
