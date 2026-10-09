
import { MoodName, Nationality, RelationshipTier } from './types';

interface FlavorConfig {
  affectionateTerms?: string[];
  affectionateTermsMale?: string[];
  slangPlayful?: string[];
  slangAnnoyed?: string[];
}

/**
 * @fileOverview Standardized nationality-based linguistic markers.
 * FIXED: Removed repetitive "goof", "goofy", and "boy please" terms from all pools.
 * EXPANDED: Added richer regional variety for more authentic generation.
 */
export const nationalityFlavor: Partial<Record<Nationality, FlavorConfig>> = {
  Ukrainian: {
    affectionateTerms: ['lyuba', 'sonce', 'zaychyk', 'kokhana'],
    affectionateTermsMale: ['koxaniy', 'milyi', 'sonce moye'],
    slangPlayful: ['eii, ti sho', 'nu davai', 'hehe, ne stydaysya', 'tse vohnishche'],
    slangAnnoyed: ['oy, ne dratuj mene', 'seryozno?', 'ta nu, dosyt vzhe', 'shcho za fihnya'],
  },

  Australian: {
    affectionateTerms: ['love', 'hun', 'babe'],
    affectionateTermsMale: ['handsome', 'big fella', 'cobber'],
    slangPlayful: ['ya cheeky bugger', 'oiii', "don’t be a sook", 'stoked as', 'reckon?', 'no wuckas'],
    slangAnnoyed: ['mate, seriously?', 'oi, cut the shit', 'you’re testing my patience', 'bloody hell','keep bloody goin','do it again i dare ya'],
  },

  British: {
    affectionateTerms: ['love', 'darling', 'pet'],
    affectionateTermsMale: ['handsome', 'luv', 'darlin', 'guv'],
    slangPlayful: ['proper sound', 'oi you', 'don’t be daft', 'it’s mental', 'innit', 'chuffed'],
    slangAnnoyed: ['don’t muck me about', 'bruv, seriously', 'you’re winding me up', 'taking the piss'],
  },

  Latina: {
    affectionateTerms: ['mi amor', 'cariño', 'corazón'],
    affectionateTermsMale: ['mi cielo', 'mi rey', 'mi amorcito'],
    slangPlayful: ['ay, tú', 'jajaja no seas así', 'qué travieso eres', 'dale pues'],
    slangAnnoyed: ['oye, en serio?', 'no me fastidies', 'ay dios mío contigo', 'qué onda contigo'],
  },

  American: {
    affectionateTerms: ['babe', 'hon', 'sweetheart'],
    affectionateTermsMale: ['handsome', 'stud', 'buddy'],
    slangPlayful: ['you’re wild for that', 'stop playing', 'no cap', 'deadass'],
    slangAnnoyed: ['are you for real?', 'don’t start', 'you’re pushin your luck', 'cut the bull shit'],
  },

  Swedish: {
    affectionateTerms: ['älskling', 'gumman'],
    affectionateTermsMale: ['älskling', 'hjärtat', 'sötnos'],
    slangPlayful: ['haha men snälla', 'du är så knäpp', 'åh herregud du', 'vad mysigt'],
    slangAnnoyed: ['sluta nu', 'är du seriös?', 'du driver med mig', 'lägg av'],
  },

  Italian: {
    affectionateTerms: ['tesoro', 'amore', 'bella'],
    affectionateTermsMale: ['amore mio', 'tesoro mio', 'bello'],
    slangPlayful: ['ma dai', 'sei un monello', 'ahah ma guarda te', 'che forza'],
    slangAnnoyed: ['oh basta', 'ma sei serio?', 'non farmi arrabbiare', 'ma che dici'],
  },

  Singapore: {
    affectionateTerms: ['dear', 'babe'],
    affectionateTermsMale: ['dear boy', 'handsome', 'laogong'],
    slangPlayful: ['lah', 'lor', 'aiyo you ah', 'steady pom pi pi', 'shiok'],
    slangAnnoyed: ['eh don’t like that leh', 'wah you testing me', 'don’t be so extra', 'simisai'],
  },

  Russian: {
    affectionateTerms: ['solnyshko', 'krasotka'],
    affectionateTermsMale: ['solnyshko moye', 'dorogoy', 'kotik'],
    slangPlayful: ['ay da ty', 'hehe ne baluysya', 'ty shalun', 'kruto'],
    slangAnnoyed: ['khvatit uzhe', 'ty seriezno?', 'ne besi menya', 'uzhas'],
  },

  Greek: {
    affectionateTerms: ['agapi mou', 'kardia mou'],
    affectionateTermsMale: ['agori mou', 'moro mou', 'psixi mou'],
    slangPlayful: ['re file', 'elaaa', 'ti kaneis re', 'opa'],
    slangAnnoyed: ['ela re, sovara tora?', 'min me trelaneis', 'ftanei pia', 'ama s agapao'],
  },

  Filipino: {
    affectionateTerms: ['mahal', 'giliw'],
    affectionateTermsMale: ['mahal', 'irog', 'pangga'],
    slangPlayful: ['asus', 'hay nako', 'echos lang', 'petmalu', 'lodi'],
    slangAnnoyed: ['ano ba', 'grabe ka naman', 'tigilan mo nga ako', 'nakakaloka'],
  },

  Egyptian: {
    affectionateTerms: ['habibti', 'ya amar'],
    affectionateTermsMale: ['habibi', 'ya amar'],
    slangPlayful: ['ya lahwy', 'fakes', 'ya gamaa', 'ashta'],
    slangAnnoyed: ['khallas', 'eh da', 'msh keda', 'ya sataar'],
  },

  Spanish: {
    affectionateTerms: ['cariño', 'mi amor', 'cielo'],
    affectionateTermsMale: ['guapo', 'mi amor', 'rey'],
    slangPlayful: ['venga ya', 'que fuerte', 'toma ya', 'tio', 'guay'],
    slangAnnoyed: ['anda ya', 'pero bueno', 'que dices', 'vete por ahi', 'me estas vacilando'],
  },

  Brazilian: {
    affectionateTerms: ['meu bem', 'querida', 'docinho'],
    affectionateTermsMale: ['meu bem', 'lindo', 'querido'],
    slangPlayful: ['e ai', 'beleza', 'que massa', 'uai', 'top'],
    slangAnnoyed: ['cara, serio?', 'para com isso', 'ta louco?', 'vixe'],
  },
};
