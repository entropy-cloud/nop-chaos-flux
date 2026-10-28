/**
 * Amount-to-words conversion (zh-CN financial uppercase, 人民币大写).
 * Returns '' for non-finite / non-numeric input; beyond-two-decimal values are
 * rounded to fen (角分抹零).
 */
const ZH_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const ZH_GROUP_UNITS = ['', '万', '亿', '万亿'];
const ZH_DIGIT_UNITS = ['', '拾', '佰', '仟'];

function zhGroupToWords(groupValue: number): string {
  let out = '';
  let zeroPending = false;
  for (let d = ZH_DIGIT_UNITS.length - 1; d >= 0; d--) {
    const digit = Math.floor(groupValue / 10 ** d) % 10;
    if (digit === 0) {
      zeroPending = out.length > 0;
    } else {
      if (zeroPending) out += ZH_DIGITS[0];
      out += ZH_DIGITS[digit] + ZH_DIGIT_UNITS[d];
      zeroPending = false;
    }
  }
  return out;
}

function zhIntegerToWords(intValue: number): string {
  if (intValue === 0) return ZH_DIGITS[0];
  let result = '';
  let pendingZero = false;
  for (let g = ZH_GROUP_UNITS.length - 1; g >= 0; g--) {
    const groupValue = Math.floor(intValue / 10000 ** g) % 10000;
    const groupWords = zhGroupToWords(groupValue);
    if (groupWords === '') {
      if (result !== '') pendingZero = true;
      continue;
    }
    if (result !== '' && (pendingZero || groupValue < 1000)) result += ZH_DIGITS[0];
    result += groupWords + ZH_GROUP_UNITS[g];
    pendingZero = false;
  }
  return result;
}

export function amountInWords(value: unknown, locale = 'zh-CN'): string {
  if (locale !== 'zh-CN') return '';
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return '';

  // Above ~9e13 yuan the fen-scaled value exceeds MAX_SAFE_INTEGER and the
  // digits would be precision-mangled — return '' (same contract as invalid input).
  const cents = Math.round(Math.abs(numeric) * 100);
  if (!Number.isSafeInteger(cents)) return '';
  const yuanValue = Math.floor(cents / 100);
  const jiao = Math.floor(cents / 10) % 10;
  const fen = cents % 10;

  if (cents === 0) return ZH_DIGITS[0] + '元整';

  let out = '';
  const yuanWords = zhIntegerToWords(yuanValue);
  if (yuanValue > 0) out += yuanWords + '元';

  if (jiao > 0) {
    out += ZH_DIGITS[jiao] + '角';
  } else if (fen > 0 && yuanValue > 0) {
    out += ZH_DIGITS[0];
  }
  if (fen > 0) {
    out += ZH_DIGITS[fen] + '分';
  }
  if (fen === 0 && jiao === 0 && yuanValue > 0) {
    out += '整';
  }

  const sign = numeric < 0 ? '负' : '';
  return sign + out;
}
