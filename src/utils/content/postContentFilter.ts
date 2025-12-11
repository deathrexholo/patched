// Content Filtering System for Posts and Content Sharing
// Sports-friendly filtering with context awareness

// Filter categories for posts
const POST_FILTER_CATEGORIES = {
  POLITICS: 'politics',
  NUDITY: 'nudity', 
  VIOLENCE: 'violence',
  HATE_SPEECH: 'hate_speech',
  SPAM: 'spam',
  DRUGS: 'drugs'
};

// Severity levels for post violations
const POST_SEVERITY_LEVELS = {
  LOW: 'low',        // Warning only
  MEDIUM: 'medium',  // Block with explanation
  HIGH: 'high',      // Block and flag for review
  CRITICAL: 'critical' // Block, flag, and potential account action
};

// Filter word lists by category for posts
const POST_FILTER_WORDS = {
  [POST_FILTER_CATEGORIES.POLITICS]: {
    english: [
      'BJP', 'Congress', 'AAP', 'Modi', 'Rahul Gandhi', 'politician', 'election',
      'vote', 'party', 'government', 'minister', 'parliament', 'democracy',
      'constitution', 'political', 'campaign', 'rally', 'manifesto', 'ballot',
      'corrupt', 'scam', 'bribe', 'reservation', 'caste', 'religion politics',
      'Hindu rashtra', 'secularism', 'communal', 'riots', 'protest', 'strike'
    ],
    hindi: [
      'राजनीति', 'नेता', 'सरकार', 'चुनाव', 'वोट', 'पार्टी', 'मंत्री',
      'संसद', 'भ्रष्टाचार', 'घोटाला', 'आरक्षण', 'जाति', 'धर्म', 'दंगा',
      'प्रदर्शन', 'हड़ताल', 'बंद'
    ],
    severity: POST_SEVERITY_LEVELS.MEDIUM
  },

  [POST_FILTER_CATEGORIES.NUDITY]: {
    english: [
      'nude', 'naked', 'sex', 'porn', 'xxx', 'adult', 'explicit', 'nsfw',
      'breast', 'nipple', 'penis', 'vagina', 'masturbate', 'orgasm', 'erotic',
      'seductive', 'strip', 'bikini', 'underwear', 'lingerie', 'intimate',
      'sexual', 'seduce', 'horny', 'arousal', 'pleasure', 'escort', 'prostitute'
    ],
    hindi: [
      'नंगा', 'अश्लील', 'यौन', 'गंदा', 'वेश्या', 'कामुक', 'उत्तेजक'
    ],
    severity: POST_SEVERITY_LEVELS.CRITICAL
  },

  [POST_FILTER_CATEGORIES.VIOLENCE]: {
    english: [
      'murder', 'blood', 'gore', 'weapon', 'gun', 'knife', 'sword', 
      'bomb', 'explosive', 'terrorist', 'attack', 'assault', 'abuse', 
      'torture', 'threatening', 'revenge', 'harm', 'damage', 'shoot', 'stab'
      // Note: Removed sports-friendly terms like 'kill', 'destroy', 'beat', 'fight'
    ],
    hindi: [
      'हत्या', 'खून', 'हिंसा', 'हथियार', 'बंदूक', 'चाकू', 'बम', 
      'आतंकवादी', 'हमला', 'दुर्व्यवहार', 'यातना', 'धमकी', 'बदला', 'नुकसान'
    ],
    severity: POST_SEVERITY_LEVELS.HIGH
  },

  [POST_FILTER_CATEGORIES.HATE_SPEECH]: {
    english: [
      'hate', 'racist', 'discrimination', 'bigot', 'prejudice', 'inferior',
      'superior', 'slur', 'offensive', 'derogatory', 'insult', 'mock',
      'ridicule', 'shame', 'humiliate', 'bully', 'harassment', 'threat',
      'worthless', 'disgusting', 'pathetic'
      // Note: Removed appearance-based terms that might be used in sports context
    ],
    hindi: [
      'नफरत', 'भेदभाव', 'जातिवाद', 'अपमान', 'धमकी', 'परेशान', 'तंग'
    ],
    severity: POST_SEVERITY_LEVELS.HIGH
  },

  [POST_FILTER_CATEGORIES.SPAM]: {
    english: [
      'buy now', 'click here', 'free money', 'earn money', 'get rich quick',
      'investment', 'scheme', 'lottery', 'prize', 'offer', 'discount', 'sale', 
      'cheap', 'deal', 'promotion', 'advertise', 'marketing', 'business opportunity', 
      'work from home', 'easy money', 'guaranteed', 'limited time', 'urgent', 'act now'
    ],
    hindi: [
      'पैसा कमाओ', 'मुफ्त पैसा', 'लॉटरी', 'इनाम', 'ऑफर', 'छूट', 'सेल',
      'व्यापार', 'घर से काम', 'आसान पैसा', 'गारंटी', 'जल्दी करें'
    ],
    severity: POST_SEVERITY_LEVELS.MEDIUM
  },

  [POST_FILTER_CATEGORIES.DRUGS]: {
    english: [
      'drugs', 'cocaine', 'heroin', 'marijuana', 'weed', 'cannabis', 'hash',
      'ecstasy', 'meth', 'alcohol', 'beer', 'wine', 'whiskey', 'vodka',
      'drunk', 'intoxicated', 'stoned', 'addiction', 'dealer',
      'substance abuse', 'overdose', 'pills', 'tablets', 'injection'
      // Note: Removed 'high' as it's used in sports context
    ],
    hindi: [
      'नशा', 'शराब', 'बीयर', 'वाइन', 'व्हिस्की', 'वोडका', 'नशेड़ी',
      'गांजा', 'चरस', 'अफीम', 'हेरोइन', 'कोकीन', 'गोलियां', 'इंजेक्शन'
    ],
    severity: POST_SEVERITY_LEVELS.HIGH
  }
};

// Sports slang and athlete-friendly terms that should NOT be filtered in posts
const SPORTS_WHITELIST = {
  english: [
    // Performance terms that might trigger filters but are sports-related
    'fire', 'lit', 'sick', 'insane', 'crazy', 'mad', 'killer', 'beast', 'monster',
    'crush', 'destroy', 'annihilate', 'murder', 'kill it', 'slay', 'dominate',
    'explosive', 'bomb', 'rocket', 'bullet', 'shot', 'blast', 'rip', 'tear',
    // Congratulatory terms
    'congrats', 'congratulations', 'props', 'respect', 'salute', 'bow down',
    // Intensity terms
    'intense', 'brutal workout', 'savage training', 'beast mode', 'go hard',
    'push limits', 'break barriers', 'smash records', 'destroy competition',
    // Common athlete slang
    'gains', 'swole', 'jacked', 'ripped', 'shredded', 'cut', 'bulk', 'lean',
    'grind', 'hustle', 'work', 'pump', 'rep', 'set', 'max out', 'PR',
    // Competition terms
    'opponent', 'rival', 'enemy', 'target', 'hunt', 'prey', 'victim',
    'conquer', 'defeat', 'victory', 'triumph', 'champion', 'winner',
    // Physical descriptors in sports context
    'strong', 'powerful', 'tough', 'hard', 'fast', 'quick', 'aggressive',
    'fierce', 'brutal', 'savage', 'wild', 'intense', 'extreme'
  ],
  hindi: [
    'बधाई', 'शाबाश', 'वाह', 'जबरदस्त', 'कमाल', 'धमाका', 'तूफान',
    'आग', 'जोश', 'जुनून', 'हौसला', 'दम', 'ताकत', 'शक्ति', 'मजबूत'
  ]
};

// Context-based patterns for posts
const POST_CONTEXT_PATTERNS = [
  // Political discussion patterns
  {
    pattern: /(bjp|congress|aap).*(bad|good|vote|support)/i,
    category: POST_FILTER_CATEGORIES.POLITICS,
    severity: POST_SEVERITY_LEVELS.MEDIUM
  },
  // Sexual content patterns  
  {
    pattern: /(want|need|looking).*(sex|hookup|adult fun)/i,
    category: POST_FILTER_CATEGORIES.NUDITY,
    severity: POST_SEVERITY_LEVELS.CRITICAL
  },
  // Spam patterns
  {
    pattern: /(earn|make).*(\$|₹|money|rupees).*(easy|quick|fast)/i,
    category: POST_FILTER_CATEGORIES.SPAM,
    severity: POST_SEVERITY_LEVELS.MEDIUM
  }
];

// Helper function to check if text contains sports whitelist terms
const checkSportsWhitelist = (text, languages) => {
  for (const language of languages) {
    if (SPORTS_WHITELIST[language]) {
      const terms = SPORTS_WHITELIST[language];
      for (const term of terms) {
        if (text.includes(term.toLowerCase())) {
          return true;
        }
      }
    }
  }
  return false;
};

// Helper function to check if a specific word is in sports whitelist
const isSportsWhitelistWord = (word, language) => {
  if (!SPORTS_WHITELIST[language]) return false;
  
  return SPORTS_WHITELIST[language].some(whitelistTerm => {
    const term = whitelistTerm.toLowerCase();
    // Check exact match or if the word is part of a whitelisted phrase
    return term === word || term.includes(word) || word.includes(term);
  });
};

// Post content filter options interface
interface PostContentFilterOptions {
  strictMode?: boolean;
  checkPatterns?: boolean;
  languages?: string[];
  context?: 'general' | 'talent_showcase' | 'sports_post';
}

// Main post content filtering function
export const filterPostContent = (text: string, options: PostContentFilterOptions = {}) => {
  const {
    strictMode = false,
    checkPatterns = true,
    languages = ['english', 'hindi'],
    context = 'general' // 'general', 'talent_showcase', 'sports_post'
  } = options;

  const violations = [];
  const cleanText = text.toLowerCase().trim();if (!cleanText) return { 
    isClean: true, 
    violations: [], 
    maxSeverity: null,
    categories: [],
    shouldBlock: false,
    shouldWarn: false,
    shouldFlag: false
  };

  // Check if text contains sports-friendly terms that should be whitelisted
  const isSportsContext = context === 'talent_showcase' || context === 'sports_post';

  // Detect sports content automatically
  const sportsKeywords = ['performance', 'training', 'workout', 'talent', 'skills', 'competition', 'match', 'game', 'victory', 'win', 'congrats', 'champion'];
  const hasAutoDetectedSports = sportsKeywords.some(keyword => cleanText.includes(keyword));
  const allowSportsTerms = isSportsContext || hasAutoDetectedSports;

  if (allowSportsTerms) {}

  // Check direct word matches
  for (const [category, data] of Object.entries(POST_FILTER_WORDS)) {
    for (const language of languages) {
      if (data[language]) {
        const words = data[language];
        
        for (const word of words) {
          // Use word boundaries for better matching
          const needsWordBoundary = word.length > 3 && !word.includes(' ');
          const regex = (strictMode && needsWordBoundary)
            ? new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
            : new RegExp(word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            
          if (regex.test(cleanText)) {
            // Check if this word should be whitelisted in sports context
            if (allowSportsTerms && isSportsWhitelistWord(word.toLowerCase(), language)) {continue; // Skip this violation for sports context
            }violations.push({
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
    for (const pattern of POST_CONTEXT_PATTERNS) {
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
        const severityOrder = [POST_SEVERITY_LEVELS.LOW, POST_SEVERITY_LEVELS.MEDIUM, POST_SEVERITY_LEVELS.HIGH, POST_SEVERITY_LEVELS.CRITICAL];
        return severityOrder.indexOf(v.severity) > severityOrder.indexOf(max) ? v.severity : max;
      }, POST_SEVERITY_LEVELS.LOW)
    : null;

  const result = {
    isClean,
    violations,
    maxSeverity,
    categories: [...new Set(violations.map(v => v.category))],
    shouldBlock: violations.some(v => 
      [POST_SEVERITY_LEVELS.MEDIUM, POST_SEVERITY_LEVELS.HIGH, POST_SEVERITY_LEVELS.CRITICAL].includes(v.severity)
    ),
    shouldWarn: violations.some(v => v.severity === POST_SEVERITY_LEVELS.LOW),
    shouldFlag: violations.some(v => 
      [POST_SEVERITY_LEVELS.HIGH, POST_SEVERITY_LEVELS.CRITICAL].includes(v.severity)
    )
  };return result;
};

// Get user-friendly post violation message
export const getPostViolationMessage = (violations, categories) => {
  const categoryMessages = {
    [POST_FILTER_CATEGORIES.POLITICS]: 'political discussions',
    [POST_FILTER_CATEGORIES.NUDITY]: 'adult or explicit content',
    [POST_FILTER_CATEGORIES.VIOLENCE]: 'violent content',
    [POST_FILTER_CATEGORIES.HATE_SPEECH]: 'hate speech or offensive language',
    [POST_FILTER_CATEGORIES.SPAM]: 'promotional or spam content',
    [POST_FILTER_CATEGORIES.DRUGS]: 'content related to drugs or alcohol'
  };

  if (categories.length === 0) return '';
  
  if (categories.length === 1) {
    return `This post contains ${categoryMessages[categories[0]]}. AmaPlayer is a sports community focused on positive interactions.`;
  } else {
    const categoryNames = categories.map(cat => categoryMessages[cat]).join(', ');
    return `This post contains inappropriate material including: ${categoryNames}. AmaPlayer is a sports community focused on positive interactions.`;
  }
};

// Log post violation for admin review
export const logPostViolation = async (userId, content, violations, context) => {
  const violationLog = {
    userId,
    content: content.substring(0, 500), // Limit stored content
    violations,
    context, // 'post', 'comment', etc.
    timestamp: new Date(),
    reviewed: false,
    action: null,
    type: 'post_content'
  };// Note: Violation logging is handled in-memory for development.
  // In production, consider implementing Firebase storage for admin review.
  return violationLog;
};

// Export filter categories and severity levels for use in components
export { POST_FILTER_CATEGORIES, POST_SEVERITY_LEVELS };