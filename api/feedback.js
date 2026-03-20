export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, dilemma, question, stepLabel, answer, a1, a2, a3 } = req.body;

  let system = '';
  let user = '';

  if (type === 'suggestion') {
    system = `너는 기업교육 현장의 AI 전략 코치야.
팀원들이 워크숍 질문에 어떻게 답하면 좋을지 답변 예시 3가지를 추천해줘.
각 예시는 실제 팀원이 말하는 것처럼 자연스럽고 구체적으로 작성해.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "suggestions": [
    "첫 번째 답변 예시 (2~3문장, 자연스러운 말투)",
    "두 번째 답변 예시 (2~3문장, 다른 관점)",
    "세 번째 답변 예시 (2~3문장, 또 다른 관점)"
  ]
}

모든 필드는 한국어로 작성해.`;
    user = `[딜레마]: ${dilemma}\n[질문 단계]: ${stepLabel}\n[질문]: ${question}`;

  } else if (type === 'workshop') {
    system = `너는 기업교육 현장에서 학습자의 고민을 듣고 함께 해결책을 찾는 'AI 전략 코치'이자 '퍼실리테이터'야.
학습자의 답변을 분석해 아래 4가지 기준으로 피드백을 제공해.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "diagnosis": "이 팀이 진짜 겪고 있는 핵심 고민을 1~2문장으로 날카롭게 짚어줘. 표면적 답변 뒤에 숨어있는 진짜 어려움을 드러내.",
  "empathy": "팀의 부담감과 두려움을 진심으로 인정하고 공감하는 1~2문장. 따뜻한 표현 사용.",
  "reframe": "지금과 다른 시각으로 상황을 바라볼 수 있는 관점 전환 1~2문장. 새로운 가능성 열어주기.",
  "action": "내일 당장 실천 가능한 아주 구체적인 행동 1가지. 누가 읽어도 바로 할 수 있는 수준으로."
}

질문 단계별 강조점:
- Q1(마음 읽기): diagnosis와 empathy에 집중
- Q2(관점 넓히기): reframe에 집중
- Q3(행동 약속): action에 집중

모든 필드는 한국어로, 각 필드는 100자 이내로 작성해.`;
    user = `[딜레마]: ${dilemma}\n[질문 단계]: ${stepLabel}\n[질문]: ${question}\n[팀 답변]: ${answer}`;

  } else if (type === 'final') {
    system = `너는 15년 차 조직개발 컨설턴트이자 AI 전략 코치야.
팀의 세 가지 답변을 조직문화 관점에서 종합 분석해 솔루션 리포트를 작성해줘.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "summary": "워크숍 전체 흐름 요약. Q1~Q3 답변에서 팀이 발견한 핵심 내용을 2~3문장으로 정리.",
  "culture_diagnosis": "조직문화 관점 진단. 이 팀의 답변 패턴에서 드러나는 조직문화적 특성과 구조적 원인을 3~4문장으로 분석. (심리적 안전감/소통구조/리더십/목표정렬 등 기준으로)",
  "feedback_criteria": [
    {"label": "소통 구조", "comment": "이 팀의 소통 방식에 대한 전문가 피드백 1~2문장"},
    {"label": "심리적 안전감", "comment": "팀 내 심리적 안전감 수준에 대한 피드백 1~2문장"},
    {"label": "리더십 역할", "comment": "리더십 관점 피드백 1~2문장"},
    {"label": "실행력", "comment": "팀의 변화 실행력에 대한 피드백 1~2문장"}
  ],
  "solutions": [
    "제3의 현실적 대안 첫 번째. 구체적이고 실현 가능하게.",
    "제3의 현실적 대안 두 번째.",
    "제3의 현실적 대안 세 번째."
  ],
  "action": "내일 당장 팀에서 실천할 수 있는 가장 작고 확실한 한 가지 액션.",
  "cheer": "이 팀에게 전하는 따뜻한 응원 메시지 1문장."
}

모든 필드는 한국어로 작성해.`;
    user = `[딜레마]: ${dilemma}\n[Q1 마음 읽기]: ${a1}\n[Q2 관점 넓히기]: ${a2}\n[Q3 행동 약속]: ${a3}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022', // 올바른 최신 모델명으로 수정됨!
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    const data = await response.json();

    // 통신 상태 체크 추가
    if (!response.ok) {
      console.error('Claude API Error:', JSON.stringify(data));
      throw new Error(data.error?.message || 'API responded with an error');
    }

    const raw = data.content?.[0]?.text || '{}';
    console.log('API raw response:', raw);

    let parsed;
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
      console.log('Parsed:', JSON.stringify(parsed));
    } catch(e) {
      console.log('Parse error:', e.message, 'raw:', raw);
      parsed = { diagnosis: raw, empathy: '', reframe: '', action: '', suggestions: [], pattern: raw, cheer: '', solutions: [] };
    }

    res.status(200).json({ feedback: parsed });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      feedback: {
        diagnosis: '분석 중 오류가 발생했습니다.',
        empathy: '클로드 서버와의 통신에 실패했습니다.',
        reframe: '', action: '', suggestions: [],
        pattern: '', cheer: '', solutions: []
      }
    });
  }
}
