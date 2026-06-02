const SIDE_LABELS = {
  left: '左侧',
  right: '右侧',
  center: '',
};

export const TYPE_LABELS = {
  muscle: '肌肉',
  tendon: '腱 / 韧带 / 筋膜',
  bone: '骨骼',
};

export const COLOR_LABELS = {
  Red: '红色',
  Orange: '橙色',
  Yellow: '黄色',
  Green: '绿色',
  Cyan: '青色',
  Blue: '蓝色',
  Purple: '紫色',
  Pink: '粉色',
};

const QUALIFIER_LABELS = {
  abdominal: '腹部',
  anterior: '前部',
  ascending: '升部',
  clavicular: '锁骨部',
  costal: '肋部',
  deep: '深部',
  descending: '降部',
  inferior: '下部',
  lateral: '外侧部',
  long: '长',
  lower: '下部',
  medial: '内侧部',
  middle: '中部',
  posterior: '后部',
  short: '短',
  sternal: '胸骨部',
  sternocostal: '胸肋部',
  superficial: '浅部',
  superior: '上部',
  transverse: '横部',
  upper: '上部',
};

const PART_LABELS = {
  part: '部',
  head: '头',
  belly: '腹',
};

export const ANATOMY_ZH_TERMS = {
  sternocleidomastoid: '胸锁乳突肌',
  platysma: '颈阔肌',
  digastric: '二腹肌',
  mylohyoid: '下颌舌骨肌',
  sternohyoid: '胸骨舌骨肌',
  omohyoid: '肩胛舌骨肌',
  thyrohyoid: '甲状舌骨肌',
  'splenius capitis': '头夹肌',
  'splenius cervicis': '颈夹肌',
  'levator veli palatini': '腭帆提肌',
  'tensor veli palatini': '腭帆张肌',
  'scalenus anterior': '前斜角肌',
  'scalenus medius': '中斜角肌',
  'scalenus posterior': '后斜角肌',
  geniohyoid: '颏舌骨肌',
  sternothyroid: '胸骨甲状肌',
  stylohyoid: '茎突舌骨肌',
  'longus capitis': '头长肌',
  'longus colli': '颈长肌',
  'lateral crico-arytenoid': '环杓侧肌',
  'posterior crico-arytenoid': '环杓后肌',
  'thyro-arytenoid': '甲杓肌',
  'transverse arytenoid': '杓横肌',
  'oblique arytenoid': '杓斜肌',
  cricothyroid: '环甲肌',
  frontalis: '额肌（枕额肌额腹）',
  'orbicularis oculi': '眼轮匝肌',
  'orbicularis oris': '口轮匝肌',
  'zygomaticus major': '颧大肌',
  'zygomaticus minor': '颧小肌',
  'levator labii superioris': '上唇提肌',
  'depressor labii inferioris': '下唇降肌',
  'depressor anguli oris': '降口角肌',
  risorius: '笑肌',
  mentalis: '颏肌',
  procerus: '降眉间肌',
  nasalis: '鼻肌',
  'corrugator supercilii': '皱眉肌',
  temporalis: '颞肌',
  masseter: '咬肌',
  'medial pterygoid': '翼内肌',
  'lateral pterygoid': '翼外肌',

  deltoid: '三角肌',
  supraspinatus: '冈上肌',
  infraspinatus: '冈下肌',
  subscapularis: '肩胛下肌',
  'teres major': '大圆肌',
  'teres minor': '小圆肌',
  'levator scapulae': '肩胛提肌',
  subclavius: '锁骨下肌',

  'pectoralis major': '胸大肌',
  'pectoralis minor': '胸小肌',
  'serratus anterior': '前锯肌',

  trapezius: '斜方肌',
  'rhomboid major': '大菱形肌',
  'rhomboid minor': '小菱形肌',
  'serratus posterior inferior': '下后锯肌',
  'serratus posterior superior': '上后锯肌',
  'latissimus dorsi': '背阔肌',
  'erector spinae': '竖脊肌',
  'iliocostalis cervicis': '颈髂肋肌',
  'iliocostalis thoracis': '胸髂肋肌',
  'iliocostalis lumborum': '腰髂肋肌',
  'longissimus capitis': '头最长肌',
  'longissimus cervicis': '颈最长肌',
  'longissimus thoracis': '胸最长肌',
  'spinalis thoracis': '胸棘肌',
  'semispinalis capitis': '头半棘肌',
  'semispinalis cervicis': '颈半棘肌',
  'semispinalis thoracis': '胸半棘肌',
  interspinalis: '棘间肌',
  intertransversarii: '横突间肌',
  'multifidus cervicis': '颈多裂肌',
  'multifidus thoracis': '胸多裂肌',
  'multifidus lumborum': '腰多裂肌',
  rotatores: '回旋肌',
  'quadratus lumborum': '腰方肌',
  'thoracolumbar fascia': '胸腰筋膜',

  'biceps brachii': '肱二头肌',
  'triceps brachii': '肱三头肌',
  brachialis: '肱肌',
  coracobrachialis: '喙肱肌',
  anconeus: '肘肌',
  brachioradialis: '肱桡肌',
  'pronator teres': '旋前圆肌',
  'pronator quadratus': '旋前方肌',
  supinator: '旋后肌',
  'flexor carpi radialis': '桡侧腕屈肌',
  'flexor carpi ulnaris': '尺侧腕屈肌',
  'extensor carpi radialis brevis': '桡侧腕短伸肌',
  'extensor carpi radialis longus': '桡侧腕长伸肌',
  'extensor carpi ulnaris': '尺侧腕伸肌',
  'flexor digitorum superficialis': '指浅屈肌',
  'flexor digitorum profundus': '指深屈肌',
  'extensor digitorum': '指伸肌',
  'extensor indicis': '示指伸肌',
  'extensor digiti minimi': '小指伸肌',
  'extensor pollicis longus': '拇长伸肌',
  'extensor pollicis brevis': '拇短伸肌',
  'abductor pollicis longus': '拇长展肌',
  'palmaris longus': '掌长肌',
  'flexor pollicis longus': '拇长屈肌',

  'external oblique': '腹外斜肌',
  'internal oblique': '腹内斜肌',
  'rectus abdominis': '腹直肌',
  'transversus abdominis': '腹横肌',
  diaphragm: '膈肌',
  'external intercostal': '肋间外肌',
  'internal intercostal': '肋间内肌',
  'innermost intercostal': '肋间最内肌',
  'transversus thoracis': '胸横肌',

  'gluteus maximus': '臀大肌',
  'gluteus medius': '臀中肌',
  'gluteus minimus': '臀小肌',
  piriformis: '梨状肌',
  'obturator internus': '闭孔内肌',
  'obturator externus': '闭孔外肌',
  iliacus: '髂肌',
  'psoas major': '腰大肌',
  'quadratus femoris': '股方肌',
  'tensor fasciae latae': '阔筋膜张肌',
  'gemellus superior': '上孖肌',
  'gemellus inferior': '下孖肌',
  pectineus: '耻骨肌',
  coccygeus: '尾骨肌',
  iliococcygeus: '髂尾肌',
  pubococcygeus: '耻骨尾骨肌',
  puborectalis: '耻骨直肠肌',
  'external anal sphincter': '肛门外括约肌',

  'rectus femoris': '股直肌',
  'vastus lateralis': '股外侧肌',
  'vastus medialis': '股内侧肌',
  'vastus intermedius': '股中间肌',
  'biceps femoris': '股二头肌',
  semitendinosus: '半腱肌',
  semimembranosus: '半膜肌',
  sartorius: '缝匠肌',
  gracilis: '股薄肌',
  'adductor longus': '长收肌',
  'adductor brevis': '短收肌',
  'adductor magnus': '大收肌',
  'adductor minimus': '小收肌',
  'iliotibial tract': '髂胫束',

  gastrocnemius: '腓肠肌',
  soleus: '比目鱼肌',
  'tibialis anterior': '胫骨前肌',
  'tibialis posterior': '胫骨后肌',
  'fibularis longus': '腓骨长肌',
  'fibularis brevis': '腓骨短肌',
  'fibularis tertius': '第三腓骨肌',
  plantaris: '跖肌',
  popliteus: '腘肌',
  'extensor digitorum longus': '趾长伸肌',
  'extensor hallucis longus': '拇长伸肌',
  'extensor hallucis brevis': '拇短伸肌',
  'flexor digitorum longus': '趾长屈肌',
  'flexor hallucis longus': '拇长屈肌',
  'calcaneal tendon': '跟腱',

  'abductor hallucis': '拇展肌',
  'flexor digitorum brevis': '趾短屈肌',
  'flexor accessorius': '跖方肌',
  'flexor hallucis brevis': '拇短屈肌',
  'abductor digiti minimi': '小趾展肌',
  'flexor digiti minimi brevis': '小趾短屈肌',

  'abductor pollicis brevis': '拇短展肌',
  'opponens pollicis': '拇对掌肌',
  'flexor pollicis brevis': '拇短屈肌',
  'adductor pollicis': '拇收肌',
};

export const ANATOMY_ZH_DETAILS = {
  sternocleidomastoid: {
    origin: '胸骨柄和锁骨内侧部',
    insertion: '颞骨乳突',
    action: '单侧收缩使头颈同侧侧屈、对侧旋转；双侧收缩参与颈部屈曲。',
    innervation: '副神经（第 XI 脑神经）及 C2-C3',
  },
  'splenius capitis': {
    origin: '项韧带及 C7-T3 棘突',
    insertion: '颞骨乳突及上项线外侧部',
    action: '单侧收缩使头同侧侧屈、同侧旋转；双侧收缩使头伸展。',
    innervation: '中颈神经后支',
  },
  'splenius cervicis': {
    origin: 'T3-T6 棘突',
    insertion: 'C1-C3 横突',
    action: '伸展并旋转颈椎。',
    innervation: '下颈神经后支',
  },
  'scalenus anterior': {
    origin: 'C3-C6 横突前结节',
    insertion: '第 1 肋斜角肌结节',
    action: '上提第 1 肋，参与颈部侧屈和旋转。',
    innervation: 'C5-C7 颈神经前支',
  },
  'scalenus medius': {
    origin: 'C2-C7 横突后结节',
    insertion: '第 1 肋上面',
    action: '上提第 1 肋，参与颈部侧屈。',
    innervation: 'C3-C8 颈神经前支',
  },
  'scalenus posterior': {
    origin: 'C4-C6 横突后结节',
    insertion: '第 2 肋外面',
    action: '上提第 2 肋，参与颈部侧屈。',
    innervation: 'C6-C8 颈神经前支',
  },
  'levator scapulae': {
    origin: 'C1-C4 横突',
    insertion: '肩胛骨内侧缘上部',
    action: '上提肩胛骨，并使肩胛盂下倾。',
    innervation: '肩胛背神经（C5）及 C3-C4',
  },
  trapezius: {
    origin: '枕外隆凸、项韧带及 C7-T12 棘突',
    insertion: '锁骨外侧部、肩峰和肩胛冈',
    action: '上部纤维上提肩胛骨，中部纤维后缩肩胛骨，下部纤维下降肩胛骨。',
    innervation: '副神经（第 XI 脑神经）及 C3-C4',
  },
  'erector spinae': {
    origin: '骶骨、髂嵴、腰椎和下胸椎棘突',
    insertion: '肋骨、颈胸椎横突/棘突及乳突',
    action: '双侧收缩伸展脊柱；单侧收缩使脊柱侧屈。',
    innervation: '脊神经后支',
  },
  'iliocostalis lumborum': {
    origin: '骶骨、髂嵴和胸腰筋膜',
    insertion: '第 6-12 肋角及 L1-L4 横突',
    action: '伸展并侧屈腰椎。',
    innervation: '腰神经及下胸神经后支',
  },
  'longissimus thoracis': {
    origin: '骶骨、腰椎棘突及下胸椎横突',
    insertion: '胸椎横突及下 9-10 对肋骨',
    action: '伸展并侧屈胸腰段脊柱。',
    innervation: '胸神经和腰神经后支',
  },
  'semispinalis capitis': {
    origin: 'C4-T6 横突',
    insertion: '枕骨上、下项线之间',
    action: '伸展头部，参与头部侧屈和对侧旋转。',
    innervation: 'C1-C6 颈神经后支',
  },
  'multifidus cervicis': {
    origin: 'C4-C7 关节突',
    insertion: '向上跨 2-4 节椎骨，止于棘突',
    action: '稳定颈椎，参与颈椎伸展和对侧旋转。',
    innervation: '颈神经后支',
  },
  'multifidus thoracis': {
    origin: '胸椎横突',
    insertion: '向上跨 2-4 节椎骨，止于棘突',
    action: '稳定胸椎，参与胸椎伸展和对侧旋转。',
    innervation: '胸神经后支',
  },
  'multifidus lumborum': {
    origin: '骶骨、髂后上棘及腰椎乳突',
    insertion: '向上跨 2-4 节椎骨，止于棘突',
    action: '腰椎重要深层稳定肌，参与腰椎伸展和对侧旋转。',
    innervation: '腰神经后支',
  },
  rotatores: {
    origin: '下位椎骨横突',
    insertion: '上位椎骨椎板及棘突根部',
    action: '参与本体感觉、脊柱伸展和对侧旋转。',
    innervation: '脊神经后支',
  },
  'quadratus lumborum': {
    origin: '髂腰韧带和髂嵴后部',
    insertion: '第 12 肋下缘及 L1-L4 横突',
    action: '躯干侧屈，深吸气时固定第 12 肋，并参与腰椎伸展。',
    innervation: '肋下神经（T12）及腰丛（L1-L4）',
  },
  'thoracolumbar fascia': {
    origin: '胸椎和腰椎棘突、骶骨、髂嵴',
    insertion: '腰椎横突、第 12 肋、腹内斜肌和腹横肌',
    action: '连接躯干肌群并传递负荷，参与腰椎稳定。',
    notes: '胸腰筋膜为包绕深层背肌的三层筋膜结构，常用于理解腰背部力传递。',
  },
  'external oblique': {
    origin: '第 5-12 肋外面',
    insertion: '白线、耻骨结节、髂嵴前部',
    action: '双侧收缩屈曲躯干并压迫腹腔；单侧收缩使躯干对侧旋转、同侧侧屈。',
    innervation: 'T7-T12 肋间神经，髂腹下神经和髂腹股沟神经',
  },
  'internal oblique': {
    origin: '胸腰筋膜、髂嵴、腹股沟韧带外侧部',
    insertion: '第 10-12 肋下缘、白线、耻骨嵴',
    action: '双侧收缩屈曲躯干并压迫腹腔；单侧收缩使躯干同侧旋转和侧屈。',
    innervation: 'T7-T12 肋间神经，髂腹下神经和髂腹股沟神经（L1）',
  },
  'transversus abdominis': {
    origin: '第 7-12 肋软骨内面、胸腰筋膜、髂嵴、腹股沟韧带外侧部',
    insertion: '白线、耻骨嵴、耻骨梳',
    action: '压迫腹腔、增加腹内压，是核心稳定的重要肌肉。',
    innervation: 'T7-T12 肋间神经，髂腹下神经和髂腹股沟神经（L1）',
  },
  diaphragm: {
    origin: '剑突、第 7-12 肋软骨、L1-L3 椎体及内/外侧弓状韧带',
    insertion: '中心腱',
    action: '主要吸气肌，收缩时增加胸腔容积。',
    innervation: '膈神经（C3-C5）',
  },
  'gluteus maximus': {
    origin: '髂骨后部、骶骨、尾骨、胸腰筋膜、骶结节韧带',
    insertion: '髂胫束及股骨臀肌粗隆',
    action: '髋关节伸展和外旋；上部纤维外展，下部纤维内收。',
    innervation: '臀下神经（L5, S1, S2）',
  },
  'gluteus medius': {
    origin: '髂骨外面，位于前、后臀线之间',
    insertion: '股骨大转子外侧面',
    action: '髋关节外展和内旋，步态中稳定骨盆。',
    innervation: '臀上神经（L4, L5, S1）',
  },
  'gluteus minimus': {
    origin: '髂骨外面，位于前、下臀线之间',
    insertion: '股骨大转子前面',
    action: '髋关节外展和内旋。',
    innervation: '臀上神经（L4, L5, S1）',
  },
  piriformis: {
    origin: '骶骨前面（S2-S4）',
    insertion: '股骨大转子上缘',
    action: '髋关节外旋，屈髋位时协助外展，并稳定髋关节。',
    innervation: '梨状肌神经（S1, S2）',
  },
  iliacus: {
    origin: '髂窝和骶骨翼',
    insertion: '股骨小转子（与腰大肌共同）',
    action: '屈髋。',
    innervation: '股神经（L2, L3）',
  },
  'psoas major': {
    origin: 'T12-L5 椎体及横突',
    insertion: '股骨小转子',
    action: '屈髋，并参与躯干侧屈。',
    innervation: '腰丛（L1-L3）',
  },
  'tensor fasciae latae': {
    origin: '髂前上棘及髂嵴前部',
    insertion: '髂胫束，经髂胫束止于胫骨外侧髁',
    action: '髋关节屈曲、外展和内旋；伸膝位稳定膝关节。',
    innervation: '臀上神经（L4, L5, S1）',
  },
  coccygeus: {
    origin: '坐骨棘和骶棘韧带',
    insertion: '骶骨下部和尾骨',
    action: '支持盆底，屈曲尾骨，并协助盆腔脏器支持。',
    innervation: 'S4-S5 脊神经分支',
  },
  iliococcygeus: {
    origin: '肛提肌腱弓（闭孔筋膜）及坐骨棘',
    insertion: '尾骨和肛尾缝',
    action: '支持盆腔脏器，抬高盆底。',
    innervation: 'S3-S4 经肛提肌神经分支',
  },
  pubococcygeus: {
    origin: '耻骨体后面及肛提肌腱弓前部',
    insertion: '肛尾缝和尾骨',
    action: '支持盆腔脏器，参与下直肠控制。',
    innervation: 'S3-S4 经肛提肌神经分支',
  },
  puborectalis: {
    origin: '耻骨体后面',
    insertion: '环绕肛直肠交界处形成吊带样结构',
    action: '维持肛直肠角，对排便控制重要。',
    innervation: 'S3-S4 经肛提肌神经分支',
  },
  'iliotibial tract': {
    origin: '阔筋膜张肌和臀大肌，经髂嵴及髂前上棘区域汇入',
    insertion: '胫骨外侧髁 Gerdy 结节',
    action: '伸膝位稳定膝关节，协助髋外展，并在步态中提供外侧稳定。',
    notes: '髂胫束是大腿外侧深筋膜增厚形成的纤维束。',
  },
};

const SORTED_TERM_KEYS = Object.keys(ANATOMY_ZH_TERMS).sort((a, b) => b.length - a.length);

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAnatomyName(rawName) {
  const clean = normalizeName(rawName);
  const side = clean.includes('left') ? 'left' : clean.includes('right') ? 'right' : 'center';
  const partMatch = clean.match(/^(.+?)\s+(part|head|belly)\s+of\s+(?:(left|right)\s+)?(.+)$/i);

  if (partMatch) {
    return {
      side,
      base: normalizeName(partMatch[4]),
      qualifier: normalizeQualifier(partMatch[1], partMatch[2]),
    };
  }

  return {
    side,
    base: clean.replace(/\b(left|right)\b/g, '').replace(/\s+/g, ' ').trim(),
    qualifier: '',
  };
}

function normalizeQualifier(rawQualifier, rawPartType) {
  const qualifier = normalizeName(rawQualifier);
  const partType = normalizeName(rawPartType);
  const zhQualifier = QUALIFIER_LABELS[qualifier] || qualifier;
  const zhPart = PART_LABELS[partType] || partType;

  if (partType === 'head' && (qualifier === 'long' || qualifier === 'short')) {
    return `${zhQualifier}${zhPart}`;
  }

  if (zhQualifier.endsWith(zhPart)) {
    return zhQualifier;
  }

  return `${zhQualifier}${zhPart}`;
}

function findTermKey(base) {
  if (ANATOMY_ZH_TERMS[base]) return base;

  for (const key of SORTED_TERM_KEYS) {
    if (base.includes(key)) return key;
  }

  const baseWords = base.split(' ');
  for (const key of SORTED_TERM_KEYS) {
    const keyWords = key.split(' ');
    if (keyWords.length >= 2 && keyWords.every((word) => baseWords.includes(word))) {
      return key;
    }
  }

  return null;
}

export function getChineseAnatomyTerm(rawName) {
  const parsed = parseAnatomyName(rawName);
  const termKey = findTermKey(parsed.base);
  if (!termKey) return null;

  const sideLabel = SIDE_LABELS[parsed.side] || '';
  const termLabel = ANATOMY_ZH_TERMS[termKey];
  const qualifierLabel = parsed.qualifier ? `（${parsed.qualifier}）` : '';

  return {
    key: termKey,
    label: `${sideLabel}${termLabel}${qualifierLabel}`,
  };
}

export function getChineseDisplayName(rawName, englishName = '') {
  const zhTerm = getChineseAnatomyTerm(rawName);
  return zhTerm?.label || englishName || rawName;
}

export function getChineseMuscleInfo(rawName) {
  const zhTerm = getChineseAnatomyTerm(rawName);
  if (!zhTerm) return null;
  return ANATOMY_ZH_DETAILS[zhTerm.key] || null;
}
