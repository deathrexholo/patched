// Chat Filtering System - Dedicated for Messages and Chat
// Strict filtering for real-time messaging

// Filter categories for chat
const CHAT_FILTER_CATEGORIES = {
  NUDITY: 'nudity',
  VIOLENCE: 'violence', 
  HATE_SPEECH: 'hate_speech',
  POLITICS: 'politics',
  DRUGS: 'drugs',
  PROFANITY: 'profanity'
};

// Severity levels for chat violations
const CHAT_SEVERITY_LEVELS = {
  MEDIUM: 'medium',  // Block with explanation
  HIGH: 'high',      // Block and flag for review
  CRITICAL: 'critical' // Block, flag, and potential account action
};

// Comprehensive chat filter word lists - STRICT for messaging
const CHAT_FILTER_WORDS = {
  [CHAT_FILTER_CATEGORIES.NUDITY]: {
    english: [
      // Explicit sexual content
      'nude', 'naked', 'sex', 'porn', 'xxx', 'adult', 'explicit', 'nsfw',
      'breast', 'nipple', 'penis', 'vagina', 'masturbate', 'orgasm', 'erotic',
      'seductive', 'strip', 'underwear', 'lingerie', 'intimate', 'sexual', 
      'seduce', 'horny', 'arousal', 'pleasure', 'escort', 'prostitute',
      'fuck', 'fucking', 'shit', 'bitch', 'ass', 'pussy', 'dick', 'cock',
      'tits', 'boobs', 'butt', 'sexy', 'hot girl', 'hot guy', 'hookup', 
      'one night', 'nudes', 'cum', 'sperm', 'ejaculate', 'climax',
      'blowjob', 'handjob', 'anal', 'oral', 'threesome', 'orgy', 'nudity',
    ],
    hindi: [
      'नंगा', 'अश्लील', 'यौन', 'गंदा', 'वेश्या', 'कामुक', 'उत्तेजक',
      'रंडी', 'भोसड़ी', 'चूत', 'लौड़ा', 'लंड', 'गांड', 'चूतिया',
      'रांड', 'भड़वा', 'हरामी', 'मादरचोद', 'भेनचोड'
    ],
    severity: CHAT_SEVERITY_LEVELS.CRITICAL
  },

  [CHAT_FILTER_CATEGORIES.VIOLENCE]: {
    english: [
      'kill', 'murder', 'death', 'blood', 'gore', 'violence', 'fight', 'beat',
      'weapon', 'gun', 'knife', 'sword', 'bomb', 'explosive', 'terrorist',
      'attack', 'assault', 'abuse', 'torture', 'hurt', 'pain', 'wound',
      'injury', 'threatening', 'revenge', 'harm', 'damage', 'shoot', 'stab',
      'die', 'dead', 'corpse', 'slaughter', 'massacre', 'execution', 'poison',
      'suicide', 'self harm', 'cutting', 'bleeding', 'scar', 'rape', 'molest'
    ],
    hindi: [
      'मार', 'हत्या', 'खून', 'हिंसा', 'लड़ाई', 'मारपीट', 'हथियार',
      'बंदूक', 'चाकू', 'बम', 'आतंकवादी', 'हमला', 'दुर्व्यवहार', 'यातना',
      'घाव', 'धमकी', 'बदला', 'नुकसान', 'मरना', 'मृत', 'लाश', 'जहर', 'आत्महत्या'
    ],
    severity: CHAT_SEVERITY_LEVELS.HIGH
  },

  [CHAT_FILTER_CATEGORIES.HATE_SPEECH]: {
    english: [
      'hate', 'racist', 'discrimination', 'bigot', 'prejudice', 'slur', 
      'offensive', 'derogatory', 'insult', 'mock', 'ridicule', 'shame', 
      'humiliate', 'bully', 'harassment', 'threat', 'stupid', 'idiot', 
      'fool', 'worthless', 'disgusting', 'pathetic', 'retard', 'faggot', 
      'nigger', 'chink', 'paki', 'backward', 'primitive', 'savage', 'barbaric'
    ],
    hindi: [
      'नफरत', 'भेदभाव', 'जातिवाद', 'अपमान', 'मूर्ख', 'बेवकूफ', 'गंदा',
      'कुत्ता', 'सुअर', 'हरामी', 'कमीना', 'गधा', 'जानवर', 'कीड़ा'
    ],
    severity: CHAT_SEVERITY_LEVELS.HIGH
  },

  [CHAT_FILTER_CATEGORIES.POLITICS]: {
    english: [
      'BJP', 'Congress', 'AAP', 'Modi', 'Rahul Gandhi', 'politician', 'election',
      'vote', 'government', 'minister', 'parliament', 'political', 'campaign',
      'corrupt', 'scam', 'bribe', 'Hindu rashtra', 'communal', 'riots'
    ],
    hindi: [
      'राजनीति', 'नेता', 'सरकार', 'चुनाव', 'वोट', 'मंत्री', 'संसद', 
      'भ्रष्टाचार', 'घोटाला', 'दंगा', 'हड़ताल'
    ],
    severity: CHAT_SEVERITY_LEVELS.MEDIUM
  },

  [CHAT_FILTER_CATEGORIES.DRUGS]: {
    english: [
      'drugs', 'cocaine', 'heroin', 'marijuana', 'weed', 'cannabis', 'hash',
      'ecstasy', 'meth', 'drunk', 'intoxicated', 'high', 'stoned', 'dealer',
      'substance abuse', 'overdose', 'pills', 'tablets', 'injection', 'needle'
    ],
    hindi: [
      'नशा', 'शराब', 'नशेड़ी', 'गांजा', 'चरस', 'अफीम', 'हेरोइन', 
      'कोकीन', 'गोलियां', 'इंजेक्शन', 'सुई'
    ],
    severity: CHAT_SEVERITY_LEVELS.HIGH
  },

  [CHAT_FILTER_CATEGORIES.PROFANITY]: {
    english: [
      'damn', 'hell', 'crap', 'piss', 'bastard', 'asshole', 'motherfucker',
      'son of a bitch', 'go to hell', 'fuck off', 'shut up', 'screw you'
    ],
    hindi: [
      'साला', 'कमीना', 'बदमाश', 'गुंडा', 'दुष्ट', 'शैतान'
    ],
    severity: CHAT_SEVERITY_LEVELS.MEDIUM
  }
};

// Chat-specific context patterns
const CHAT_CONTEXT_PATTERNS = [
  // Sexual solicitation patterns
  {
    pattern: /(want|need|looking for).*(sex|hookup|fun|adult)/i,
    category: CHAT_FILTER_CATEGORIES.NUDITY,
    severity: CHAT_SEVERITY_LEVELS.CRITICAL
  },
  // Violence threat patterns
  {
    pattern: /(will|gonna|going to).*(kill|hurt|beat|destroy) you/i,
    category: CHAT_FILTER_CATEGORIES.VIOLENCE,
    severity: CHAT_SEVERITY_LEVELS.HIGH
  },
  // Political arguments
  {
    pattern: /(bjp|congress|modi).*(bad|good|hate|love)/i,
    category: CHAT_FILTER_CATEGORIES.POLITICS,
    severity: CHAT_SEVERITY_LEVELS.MEDIUM
  }
];

// Chat filter options interface
interface ChatFilterOptions {
  checkPatterns?: boolean;
  languages?: string[];
}

// Main chat filtering function - STRICT, NO SPORTS WHITELIST
export const filterChatMessage = (text: string, options: ChatFilterOptions = {}) => {
  const {
    checkPatterns = true,
    languages = ['english', 'hindi']
  } = options;

  const violations = [];
  const cleanText = text.toLowerCase().trim();if (!cleanText) {
    return { 
      isClean: true, 
      violations: [],
      maxSeverity: null,
      categories: [],
      shouldBlock: false,
      shouldWarn: false,
      shouldFlag: false
    };
  }

  // Check direct word matches - STRICT for chat
  for (const [category, data] of Object.entries(CHAT_FILTER_WORDS)) {
    for (const language of languages) {
      if (data[language]) {
        const words = data[language];
        
        for (const word of words) {
          // Always use word boundaries for better matching in chat
          const regex = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          
          if (regex.test(cleanText)) {violations.push({
              category,
              severity: data.severity,
              word,
              language,
              type: 'direct_match'
            });
          }
        }
      }
    }
  }

  // Check context patterns
  if (checkPatterns) {
    for (const pattern of CHAT_CONTEXT_PATTERNS) {
      if (pattern.pattern.test(text)) {violations.push({
          category: pattern.category,
          severity: pattern.severity,
          pattern: pattern.pattern.toString(),
          type: 'context_pattern'
        });
      }
    }
  }

  // Determine overall result
  const isClean = violations.length === 0;
  const maxSeverity = violations.length > 0 
    ? violations.reduce((max, v) => {
        const severityOrder = [CHAT_SEVERITY_LEVELS.MEDIUM, CHAT_SEVERITY_LEVELS.HIGH, CHAT_SEVERITY_LEVELS.CRITICAL];
        return severityOrder.indexOf(v.severity) > severityOrder.indexOf(max) ? v.severity : max;
      }, CHAT_SEVERITY_LEVELS.MEDIUM)
    : null;

  const result = {
    isClean,
    violations,
    maxSeverity,
    categories: [...new Set(violations.map(v => v.category))],
    shouldBlock: violations.length > 0, // Block ALL violations in chat
    shouldWarn: false, // No warnings in chat - just block
    shouldFlag: violations.some(v => 
      [CHAT_SEVERITY_LEVELS.HIGH, CHAT_SEVERITY_LEVELS.CRITICAL].includes(v.severity)
    )
  };return result;
};

// Get user-friendly chat violation message
export const getChatViolationMessage = (violations, categories) => {
  const categoryMessages = {
    [CHAT_FILTER_CATEGORIES.NUDITY]: 'sexual or explicit content',
    [CHAT_FILTER_CATEGORIES.VIOLENCE]: 'violent or threatening content',
    [CHAT_FILTER_CATEGORIES.HATE_SPEECH]: 'hate speech or offensive language',
    [CHAT_FILTER_CATEGORIES.POLITICS]: 'political discussions',
    [CHAT_FILTER_CATEGORIES.DRUGS]: 'content related to drugs or alcohol',
    [CHAT_FILTER_CATEGORIES.PROFANITY]: 'profanity or inappropriate language'
  };

  if (categories.length === 0) return '';
  
  if (categories.length === 1) {
    return `This message contains ${categoryMessages[categories[0]]}. Please keep conversations sports-focused and respectful.`;
  } else {
    const categoryNames = categories.map(cat => categoryMessages[cat]).join(', ');
    return `This message contains inappropriate content including: ${categoryNames}. Please keep conversations sports-focused and respectful.`;
  }
};

// Log chat violation for admin review
export const logChatViolation = async (userId, content, violations, context = 'chat') => {
  const violationLog = {
    userId,
    content: content.substring(0, 200), // Limit stored content for chat
    violations,
    context,
    timestamp: new Date(),
    reviewed: false,
    action: null,
    type: 'chat_message'
  };// Note: Violation logging is handled in-memory for development.
  // In production, consider implementing Firebase storage for admin review.
  return violationLog;
};

// Export filter categories and severity levels for use in components
export { CHAT_FILTER_CATEGORIES, CHAT_SEVERITY_LEVELS };