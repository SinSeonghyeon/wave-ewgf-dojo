const FRAME = 1000/60;
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const fmtF = ms => (ms>=0?'+':'−') + Math.abs(ms/FRAME).toFixed(1) + 'f';
const fmtMs = ms => (ms>=0?'+':'−') + Math.abs(Math.round(ms)) + 'ms';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WALK_F = 90, WALK_B = 70, TAP_MS = 250; // walk speed px/s (forward/back), f,N,f double-tap dash window. Visual only; judging never reads these.
const FF_MS = 250;      // judging: f,f+2 (통발) accepts the 2 up to this long after the second f (state 1/2 with cd.dashT===cd.tF)
const RUSH_PTS = {kill:10, wgf:5, dashMax:3}; // 더미 격파: correct hit 10, non-just WGF on the high dummy 5, each crouch dash min(chain,3)
// 백대시 모델 (2026-10-02 실측 반영, 결정 17(backdash)). 커뮤니티 실측(철권 8 시트 + 영상 원자료 교차 확인) 기반이고 근거·공식은 .agents/docs/BACKDASH.md.
// 거리는 실게임 연습 모드의 "상대와의 거리"와 같은 단위(m). 숫자만 고치면 판정·거리·등급·문구·연출·테스트가 함께 따라온다.
const BD = {
  // D(h): h프레임째에 1(↙)로 끊었을 때 물러난 거리(m). 프레임은 백대시가 나온 프레임(두 번째 4)을 1f로 센다(2026-10-08, 초풍·웨캔기어 표기와 같음. bdFrameNo). 미시마 5인 평균 S자 곡선 — 처음엔 느리고 6~11f가 가장 빠르며 15~16f에 멈춘다.
  // 마지막 값이 풀 백대시(BD_FULL)이고 그 뒤 프레임은 더 움직이지 않는다.
  CURVE: [0.008,0.030,0.064,0.108,0.162,0.222,0.284,0.350,0.412,0.464,0.518,0.562,0.594,0.616,0.630,0.636,0.638],
  RECOVER_F: 26,   // 캔슬 없는 백대시의 경직(출력 순간부터 잰 길이 — 다음 백대시는 RECOVER_F+1f부터). 실측 총 길이 약 25f(영상)와 맞는다. 그동안 뒤로만 못 간다(백대시·뒤 걷기 없음, 나머지는 전부 가능). 앉기·횡(1/2/3/7/8/9)이 경직을 지운다 — 모든 모드의 연출과 bd 판정이 같은 bdRec을 본다
  LINK_MAX_F: 60,  // 1이 이보다 늦으면 세트가 아니라 그냥 앉기 → 연속 종료 (4 탭·N 자체는 TAP_MS 안이어야 4N4로 묶인다)
  CANCEL_A: 11, CANCEL_B: 13, // 1(↙)을 누른 순간 보여 주는 권장 캔슬 창. 손 입력 3~14f의 공식 최적(bdBestH 12~13f)이 모두 이 안에 있다
  DB_F: 2,         // 손 입력 중 1(↙) 홀드 목표(1을 누른 뒤 4로 굴릴 때까지). 이론 최소 1f
  TAP_F: 4,        // 손 입력 중 4 N 4 목표(첫 4 → 두 번째 4 = 백대시 출력). 이론 최소 2f
  HAND_F: 6,       // 손 입력 c 목표 = DB_F + TAP_F (1을 누른 뒤 다음 백대시가 나올 때까지). 이론 최소 3f
  TIERS: [{k:'top', c:7}, {k:'fast', c:10}, {k:'ok', c:16}], // 세트 등급: 손 입력 c프레임으로 최적 캔슬했을 때의 속도 이상이면 그 등급(하한 m/s는 BD_TIER_MPS). 미만이면 'slow'
  PX: 56,          // 연출: 풀 백대시가 스테이지에서 움직이는 픽셀. 모양은 CURVE 그대로다
};
const BD_LAST = BD.CURVE.length;                                              // 이 프레임 뒤로는 백대시가 더 움직이지 않는다
const BD_FULL = BD.CURVE[BD_LAST-1];                                          // 끝까지 나간(캔슬 없는) 백대시의 거리
const BD_NEXT_F = BD.RECOVER_F+1;                                             // 캔슬 없는 백대시 뒤 다음 백대시가 나올 수 있는 첫 프레임 번호
const BD_MOVE_MS = (BD_LAST-1)*FRAME;                                         // 출력(1f)부터 BD_LAST f에 멈출 때까지 걸리는 시간 (연출도 이 길이)
// 프레임 원점은 이 두 함수에만 둔다: bdFrameNo는 "몇 f째인가"(출력 = 1f), bdF는 "몇 f 동안인가"(구간 길이, 최소 1f). 섞어 쓰면 1f가 조용히 어긋난다.
const bdFrameNo = ms => Math.round(Math.max(0, ms)/FRAME)+1;                  // backdash frame number of a moment ms after the output: the output frame (second 4) is 1f, like startup frames
const bdF = ms => Math.max(1, Math.round(ms/FRAME));                          // length of an interval in frames (hand, 1 hold, 4 N 4), as the history strip shows it
const bdDist = h => h<1 ? 0 : BD.CURVE[Math.min(h, BD_LAST)-1];               // metres earned by a backdash cancelled on frame h (the output frame is 1f)
const bdMps = (dist, period) => Math.round(dist*6000/period)/100;             // set speed in m/s, 2 decimals (period in frames)
const bdPeriod = (h, c) => h-1+c; // frames from this backdash out to the next: h−1 elapsed before the 1 (the output frame is 1f), then the hand c
// 공식: 세트 속도 = D(h) × 60 ÷ (h − 1 + c). 손 입력 c가 정해지면 이 값을 가장 크게 만드는 캔슬 프레임이 최적이다.
const bdBestH = c => { let best = 1; for(let h=2; h<=BD_LAST; h++) if(bdDist(h)*bdPeriod(best,c) > bdDist(best)*bdPeriod(h,c)) best = h; return best; };
const bdTopMps = c => { const h = bdBestH(c); return bdMps(bdDist(h), bdPeriod(h,c)); }; // the fastest set a c-frame hand can make
const BD_TIER_MPS = BD.TIERS.map(x => ({k:x.k, c:x.c, mps:bdTopMps(x.c)}));
// 기원권·기원초 모델 (2026-09-23). 실측 전 결정 17(backdash)의 옛 BD와 같은 취급 — 실게임 미확인 **가정값**이고 문구·테스트가 이 상수를 읽으므로 숫자만 고치면 된다.
// 출처는 커뮤니티 프레임 데이터(철권 8 기준)이며 시즌마다 바뀔 수 있다. 사이트는 명중 프레임을 재현하지 않고 입력 시작 시점만 잰다(결정 27(mist)).
const GIWON = {
  ACTIVE_F: 14,      // 발동(명중) 프레임. 연출 접촉 시각 HIT_CONTACT_MS.giwon도 여기서 나온다
  RECOVERY_F: 32,    // 기원권 리커버리. 명중 시각 + 이 프레임 = 다음 입력을 받는 기준점(경직 해제 0f)
  GROUND_F: 13,      // 배잡기 경직의 지상 판정 유지. 안내 문구 전용이고 성공 판정에는 쓰지 않는다
  BUFFER_F: 8,       // 경직 해제 직전 이 프레임 안에 눌린 버튼만 버퍼된다. 그 전 버튼은 버려진다
  FAULT_MS: 450,     // 시작 6 → ↘ 직행의 "6 → 3" 실패 문구를 이만큼 미뤄 기원권 굴림(앞 1프레임 스침)을 실패로 찍지 않는다
  CRUMPLE_MS: 900,   // 카운터 명중한 더미가 날아가지 않고 제자리에서 배를 잡는 시간 (연출)
  LINK_MS: 1200,     // 기원권 입력 시각부터 기원초 링크 피드백을 유지하는 창
};
// 도발 제트어퍼 모델 (2026-10-15, 결정 35(tju)). 철권 8 Ver.3.02.02 연습 모드 실측(키보드 자동 입력, 게임 입력 이력·콤보 카운터로 확인).
// 근거·출처는 .agents/docs/TJU.md. 프레임은 도발(1+3+4)을 누른 프레임을 1f로 센다. 숫자만 고치면 판정·타임라인·문구·테스트가 따라온다.
const TJ = {
  KNEE_F: 28,     // 도발 무릎(가드 불가 중단)이 맞는 프레임. 이 프레임까지 들어온 입력은 무릎이 나가기 전에 도발을 끊는다 (28f 입력도 무릎 없음)
  CANCEL_F: 32,   // 이 프레임까지의 입력이 도발을 캔슬한다. 33f부터는 입력이 무시되고 도발이 END_F까지 그대로 나간다
  END_F: 77,      // 캔슬하지 않은 도발의 마지막 프레임(78f부터 행동)
  LOSS: 34,       // 캔슬하지 않은 도발은 무릎을 맞혀도 이만큼 불리(연습 정보창 −34, 실측 F20)
  ADV: 16,        // 무릎 히트 이득 +16: 무릎 다음 프레임(29f)부터 이 프레임 수 안 = KNEE_F+ADV(44f)까지 맞는 후속기만 콤보
  JU_F: 14,       // 제트어퍼(6 N 4+RP) 발생. 4+RP가 1f, 14f째에 맞는다
  JU_B_EARLY: 3,  // 4를 RP보다 이만큼 먼저 눌러도 제트어퍼가 나간다 — 발생은 RP 프레임부터라 그만큼 늦다
  JU_F_MAX: 5, JU_N_MAX: 6, // 제트어퍼가 확인된 앞(6)·중립 유지 길이(1~5f · 1~6f). 더 길면 측정하지 않았다
  WAIT_F: 15,     // 캔슬 입력 뒤(6 N 4를 넣는 중이면 그 마지막 단계 뒤) 이만큼 아무 기술도 나오지 않으면 "캔슬만"으로 끝낸다 (판정 기한, 실측값 아님 — 제트어퍼의 실측 창 5·6·3f보다 길게)
  // 후속기 발생 프레임(게임 표시값, 2026-10-12 실측). 키 = 방향(1P 기준) + 같은 프레임 버튼. 표에 없는 입력은 발생을 모르므로 콤보를 단정하지 않는다
  STARTUP: {'1':10,'2':10,'f+1':10,'d+1':10,'db+1':10,'1+4':10,'4':12,'uf+2':13,'d+2':14,'df+1':15,'f+2':15,'d+4':15,'db+2':15,'3':16,'b+4':16,'f+3':16,'1+2':17,'b+2':17,'f+4':18,'3+4':18,'b+3':19,'b+1':20,'uf+1':20,'uf+4':24},
};
const TJ_LAST = TJ.KNEE_F + TJ.ADV;            // 44f: 후속기가 이 프레임까지 맞아야 콤보. 제트어퍼는 31f(앞 29f·중립 30f) 발동일 때만 들어간다
const TJ_GO = TJ_LAST - TJ.JU_F + 1;           // 31f: 도발 제트어퍼의 4+RP 프레임 (그 앞 두 프레임이 6·N)
const TJ_SIX = TJ_GO - 2;                      // 29f: 도발 제트어퍼의 6 = 목표 캔슬 프레임. 무릎 다음 프레임(KNEE_F+1)과 같아(ADV = JU_F+2) 도발 제트어퍼는 저스트 프레임이다.
                                               // 문구가 "무릎이 맞은 다음 프레임에 6"이라고 쓰므로 둘이 같은지 테스트가 지킨다
const TJ_TAUNT = [1,3,4];                       // 도발 = LP+LK+RK 같은 프레임 (설정의 1+3+4 키 하나로도 누를 수 있다)
// 카운터 히트 카메라 푸시. 연출 전용이며 판정·좌표·명중 판정에 영향이 없다.
// PEAK은 가정값이다 — 제공된 영상이 명중 프레임에서 시작해 진입 구간이 녹화에 없다. OUT_MS만 실측(28프레임 ease-out)이다.
const GIWON_ZOOM = {PEAK: 1.12, IN_MS: 60, OUT_MS: 470};

