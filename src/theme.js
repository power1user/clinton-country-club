// Windhaven palette — ported from the design handoff (cc-core / tg-core)
export const G = {
  bg: '#F2EDE0',
  card: '#EAE4D0',
  green: '#1B3A2D',
  greenMid: '#234D38',
  greenDk: '#152E24',
  text: '#1A180F',
  muted: '#786E5C',
  brass: '#9B7A1E',
  brassLt: '#C4A040',
  border: '#D4CCB8',
  openBg: '#1A5C34', openDot: '#52C178', openTxt: '#A8D8B8',
  limBg: '#6B4A10',  limDot: '#E8B840',  limTxt: '#D8C080',
  clsBg: '#6B2020',  clsDot: '#E05454',  clsTxt: '#D8A0A0',
};

export function gCfg(state) {
  return {
    open:    { bg: G.openBg, dot: G.openDot,           txt: G.openTxt,           lbl: 'Open' },
    limited: { bg: G.limBg,  dot: G.limDot,            txt: G.limTxt,            lbl: 'Limited' },
    closed:  { bg: G.clsBg,  dot: G.clsDot,            txt: G.clsTxt,            lbl: 'Closed' },
    members: { bg: G.brass,  dot: G.brassLt,           txt: '#F2E5C0',           lbl: 'Members' },
  }[state] || { bg: G.openBg, dot: G.openDot, txt: G.openTxt, lbl: state || 'Open' };
}
