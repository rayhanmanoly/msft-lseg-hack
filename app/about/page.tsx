import Link from 'next/link';

export const metadata = {
  title: 'About Ethos | Invest with purpose',
  description:
    'Ethos is an AI-powered investment platform that helps charities, nonprofits and foundations invest responsibly, intelligently and in line with their values.',
};

const QUESTIONS = [
  ['Where should we invest?', 'How can we generate sustainable financial returns without exposing the organisation to unnecessary risk?'],
  ['Are our investments ethical?', "How can we ensure our money isn't indirectly supporting industries or companies that contradict our mission?"],
  ['Can we trust our decisions?', 'How can we understand the risks, evaluate the evidence, and justify investment decisions to donors, trustees, and stakeholders?'],
];

const STEPS = [
  ['Understands your finances', 'Available capital, investment horizon, liquidity requirements and risk tolerance.', 'Live: Ethos asks in the chat'],
  ['Lets you define your principles', 'Exclude industries such as weapons, tobacco, fossil fuels and gambling.', 'Live'],
  ['Looks beyond industry labels', 'Ethos reads an evidence base built from public news and sources: dated incidents on environmental practices, human rights, labour conditions, corruption and corporate governance, with quotes and links.', 'Live for 110 UK companies, more coming'],
  ['Builds a balanced portfolio', 'Evaluates stocks, ETFs and bonds, constructing a diversified portfolio that seeks to balance financial performance, risk, liquidity and ethical alignment.', 'In progress: weights are a placeholder, no price data yet'],
];

const AUDIENCE = [
  ['Small and medium-sized charities', 'That lack dedicated investment teams but need to manage financial resources responsibly.'],
  ['Nonprofit organisations', 'Seeking to preserve and potentially grow funds while remaining consistent with their missions.'],
  ['Charitable foundations', 'Managing donations, grants, and long-term investment portfolios.'],
  ['University endowments and scholarship funds', 'Seeking sustainable long-term growth to support future generations.'],
  ['Mission-driven organisations', 'That want greater transparency and control over the ethical implications of their investments.'],
];

export default function About() {
  return (
    <div className="shell about">
      <header className="hero-band about-hero">
        <span className="orb o1" />
        <span className="orb o2" />
        <div className="hero-inner">
          <p className="eyebrow">About Ethos</p>
          <h2 className="motto" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)' }}>
            An AI-powered ethical investment advisor
          </h2>
          <p>
            Ethos helps charities, nonprofit organisations and foundations invest their money responsibly,
            intelligently, and in alignment with their values.
          </p>
        </div>
      </header>

      <section className="prose">
        <h2>The problem</h2>
        <p>Charities exist to make a positive impact, yet managing their finances presents a difficult challenge.</p>
        <p>
          Many organisations receive donations, grants, or maintain financial reserves that could potentially be invested
          to support their long-term missions. However, they often lack the financial expertise, resources, or dedicated
          investment teams needed to make informed investment decisions.
        </p>
        <p>They face three fundamental questions:</p>
        <div className="grid3">
          {QUESTIONS.map(([q, a]) => (
            <div key={q} className="card built">
              <b>{q}</b>
              <p className="muted" style={{ margin: 0 }}>
                {a}
              </p>
            </div>
          ))}
        </div>
        <p>
          For example, imagine an environmental charity unknowingly investing in a company involved in fossil fuel
          extraction, or a humanitarian organisation investing in a weapons manufacturer. Even if those investments
          generate attractive financial returns, they could contradict the organisation&apos;s fundamental purpose and
          damage the trust of its supporters.
        </p>
        <p>
          At the same time, keeping all available funds in cash or choosing investments solely because they appear
          ethical may not be the most suitable financial strategy, particularly for organisations with long-term funding
          commitments.
        </p>
        <blockquote>Charities should not have to choose between financial sustainability and ethical integrity.</blockquote>
      </section>

      <section className="prose">
        <h2>Our solution</h2>
        <p>
          Ethos bridges the gap between financial intelligence and ethical responsibility. It is built to combine
          artificial intelligence, financial market data, ethical screening, and quantitative portfolio optimisation to
          help organisations make more informed investment decisions. The badges below show what works in the demo
          today.
        </p>
        <ol className="how about-steps">
          {STEPS.map(([title, text, status], i) => (
            <li key={title}>
              <span className="num">{i + 1}</span>
              <b>{title}</b>
              <span className="muted">{text}</span>
              <span className={`status ${status.startsWith('Live') ? 'live' : 'soon'}`}>{status}</span>
            </li>
          ))}
        </ol>
        <div className="card soft callout">
          <b>Every recommendation is explained.</b> Ethos says why an investment was considered, what risks it carries,
          and how it aligns with the organisation&apos;s values. Ethical assessments are supported by sources, with
          uncertain cases flagged for review. <span className="status live">Live for the ethics check</span> Every exclusion
          and close call shows dated incidents with quotes and links, and companies without enough evidence are marked
          &quot;not rated&quot;. The financial reasoning is still a placeholder.
        </div>
      </section>

      <section className="prose">
        <h2>Who is Ethos for?</h2>
        <div className="grid2">
          {AUDIENCE.map(([title, text]) => (
            <div key={title} className="card built">
              <b>{title}</b>
              <p className="muted" style={{ margin: 0 }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="prose">
        <h2>Why Ethos matters</h2>
        <p>
          Ethical investing is not simply about selecting companies with positive sustainability ratings. Different
          organisations have different values, financial obligations, and definitions of responsible investing.
        </p>
        <p>
          An environmental charity may prioritise excluding fossil fuels, while a humanitarian organisation may focus on
          weapons, human rights, and labour practices. Similarly, an organisation that needs its funds within twelve
          months should not follow the same investment strategy as a foundation investing for the next fifty years.
        </p>
        <p>
          Ethos recognises that responsible investing is personal to each organisation. Rather than offering a generic
          ESG portfolio, it creates recommendations tailored to each organisation&apos;s mission and financial
          circumstances. It also makes complex financial information more accessible, helping trustees and decision-makers
          understand the reasoning behind proposed investments instead of relying on opaque scores or unexplained
          algorithms.
        </p>
      </section>

      <section className="hero-band purpose">
        <span className="orb o3" />
        <div className="hero-inner">
          <h2 style={{ color: '#fff' }}>Our purpose</h2>
          <p style={{ fontSize: '1.15rem', color: '#fff' }}>
            We believe that money intended to do good should be managed with the same care, responsibility, and integrity
            as the mission it supports.
          </p>
          <p>
            Ethos aims to democratise access to ethical investment analysis, helping organisations make informed financial
            decisions without losing sight of what matters most. Our goal is not simply to help charities generate
            returns. It is to help them protect their resources, support their long-term sustainability, maintain the
            trust of their donors, and ensure their investments reflect the values they stand for.
          </p>
          <p className="motto" style={{ fontSize: '1.6rem', margin: '1rem 0 0' }}>
            Invest with purpose. <span>Grow with confidence.</span>
          </p>
          <div className="cta-row">
            <Link href="/" className="btn gold">
              Start with Ethos
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
