export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, dilemma, question, stepLabel, answer, a1, a2, a3 } = req.body;

  let system = '';
  let user = '';

  if (type === 'workshop') {
    system = `너는 기업교육 현장에서 학습자의 고민을 듣고 함께 해결책을 찾는 'AI 전략 코치'이자 '퍼실리테이터'야.
학습자의 답변을 분석해 아래 4가지 기준으로 피드백을 제공해.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "diagnosis": "이 팀이 진짜 겪고 있는 핵심 고민을 1~2문장으로 날카롭게 짚어줘. 표면적 답변 뒤에 숨어있는 진짜 어려움을 드러내.",
  "empathy": "팀의 부담감과 두려움을 진심으로 인정하고 공감하는 1~2문장. 따뜻한 표현 사용.",
  "reframe": "지금과 다른 시각으로 상황을 바라볼 수 있는 관점 전환 1~2문장. 새로운 가능성 열어주기.",
  "action": "내일 당장 실천 가능한 아주 구체적인 행동 1가지. 누가 읽어도 바로 할 수 있는 수준으로.",
  "suggestion": "팀이 이 질문에 어떻게 답하면 좋을지 모범 답변 예시 2~3문장. 실제로 팀이 입력할 수 있는 자연스러운 말투로."
}

질문 단계별 강조점:
- Q1(마음 읽기): diagnosis와 empathy에 집중
- Q2(관점 넓히기): reframe에 집중
- Q3(행동 약속): action에 집중

모든 필드는 한국어로, 각 필드는 100자 이내로 작성해.`;

    user = `[딜레마]: ${dilemma}\n[질문 단계]: ${stepLabel}\n[질문]: ${question}\n[팀 답변]: ${answer}`;

  } else if (type === 'final') {
    system = `너는 15년 차 조직개발 컨설턴트이자 AI 전략 코치야.
학습자의 세 가지 답변을 종합해 딜레마 솔루션 캔버스를 작성해줘.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마.

{
  "pattern": "이 팀의 핵심 고민 패턴. 3가지 답변에서 공통적으로 드러나는 근본적인 어려움을 2~3문장으로.",
  "cheer": "이 팀에게 전하는 따뜻한 응원 메시지 1문장.",
  "solutions": [
    "제3의 현실적 대안 첫 번째. 구체적이고 실현 가능하게.",
    "제3의 현실적 대안 두 번째.",
    "제3의 현실적 대안 세 번째."
  ],
  "action": "내일 당장 팀에서 실천할 수 있는 가장 작고 확실한 한 가지 액션."
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    const data = await response.json();
    const raw = data.content?.[0]?.text || '{}';

    let parsed;
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { diagnosis: raw, empathy: '', reframe: '', action: '', suggestion: '', pattern: raw, cheer: '', solutions: [] };
    }

    res.status(200).json({ feedback: parsed });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      feedback: {
        diagnosis: '분석 중 오류가 발생했습니다.',
        empathy: '잠시 후 다시 시도해주세요.',
        reframe: '', action: '', suggestion: '',
        pattern: '', cheer: '', solutions: []
      }
    });
  }
}
