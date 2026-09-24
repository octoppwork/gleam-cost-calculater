"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Cpu,
  Plus,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";

type Member = { id: number; name: string; salary: number; days: number };
type ExternalCost = { id: number; category: string; owner: string; cost: number };

const MEMBER_LIBRARY: Array<{ name: string; salary: number }> = [];
const CREDITS_PER_RMB = 12.5;

const holidays = new Set([
  "2026-01-01", "2026-01-02", "2026-01-03",
  "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19",
  "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23",
  "2026-04-04", "2026-04-05", "2026-04-06",
  "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
  "2026-06-19", "2026-06-20", "2026-06-21",
  "2026-09-25", "2026-09-26", "2026-09-27",
  "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
  "2026-10-05", "2026-10-06", "2026-10-07",
]);
const makeupWorkdays = new Set([
  "2026-01-04", "2026-02-14", "2026-02-28",
  "2026-05-09", "2026-09-20", "2026-10-10",
]);

function workdaysBetween(start: string, end: string) {
  if (!start || !end || start > end) return 0;
  let count = 0;
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    const weekend = cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6;
    if (makeupWorkdays.has(key) || (!weekend && !holidays.has(key))) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export default function Home() {
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "", salary: 0, days: 12 },
  ]);
  const [externalCosts, setExternalCosts] = useState<ExternalCost[]>([
    { id: 1, category: "剪辑", owner: "", cost: 0 },
    { id: 2, category: "调色", owner: "", cost: 0 },
    { id: 3, category: "Online", owner: "", cost: 0 },
    { id: 4, category: "声音", owner: "", cost: 0 },
  ]);
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-09-30");
  const [credits, setCredits] = useState(12000);
  const [margin, setMargin] = useState(50);
  const [riskRate, setRiskRate] = useState(15);
  const [taxRate, setTaxRate] = useState(6);
  const [afterTaxDraft, setAfterTaxDraft] = useState<string | null>(null);
  const [openLibraryFor, setOpenLibraryFor] = useState<number | null>(null);

  const projectDays = workdaysBetween(startDate, endDate);
  const result = useMemo(() => {
    const labor = members.reduce(
      (total, member) => total + (member.salary / 21.75) * member.days,
      0,
    );
    const external = externalCosts.reduce((total, item) => total + item.cost, 0);
    const compute = credits / CREDITS_PER_RMB;
    const totalCost = labor + external + compute;
    const baseQuote = totalCost / Math.max(1 - margin / 100, 0.01);
    const risk = baseQuote * (riskRate / 100);
    const beforeTax = baseQuote + risk;
    const tax = beforeTax * (taxRate / 100);
    return {
      labor,
      external,
      compute,
      totalCost,
      baseQuote,
      risk,
      beforeTax,
      tax,
      afterTax: beforeTax + tax,
      profit: baseQuote - totalCost,
    };
  }, [members, externalCosts, credits, margin, riskRate, taxRate]);

  const updateMember = (
    id: number,
    field: "name" | "salary" | "days",
    value: string,
  ) => {
    setMembers((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, [field]: field === "name" ? value : Number(value) }
          : item,
      ),
    );
  };

  const updateExternal = (
    id: number,
    field: "category" | "owner" | "cost",
    value: string,
  ) => {
    setExternalCosts((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, [field]: field === "cost" ? Number(value) : value }
          : item,
      ),
    );
  };

  const updateAfterTaxQuote = (value: string) => {
    setAfterTaxDraft(value);
    if (value === "") return;

    const afterTaxQuote = Number(value);
    if (!Number.isFinite(afterTaxQuote) || afterTaxQuote < 0) return;

    const beforeTaxQuote = afterTaxQuote / (1 + taxRate / 100);
    const baseQuote = beforeTaxQuote / (1 + riskRate / 100);
    const nextMargin =
      baseQuote > 0
        ? (1 - result.totalCost / baseQuote) * 100
        : 0;

    setMargin(Math.min(90, Math.max(0, nextMargin)));
  };

  const marginLabel = Number.isInteger(margin)
    ? String(margin)
    : margin.toFixed(1);
  const riskAdjustedMargin =
    result.beforeTax > 0
      ? ((result.beforeTax - result.totalCost) / result.beforeTax) * 100
      : 0;
  const riskAdjustedMarginLabel = Number.isInteger(riskAdjustedMargin)
    ? String(riskAdjustedMargin)
    : riskAdjustedMargin.toFixed(1);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="workspace">
        <header className="app-header">
          <div>
            <p className="eyebrow">Project Pricing</p>
            <h1>成本核算器</h1>
            <p className="header-copy">根据项目投入，快速得到可靠报价。</p>
          </div>
          <div className="formula-chip">
            未税报价 = 总成本 ÷ (1 − 利润率) × (1 + 风险比例)
          </div>
        </header>

        <div className="app-grid">
          <div className="input-stack">
            <GlassSection
              icon={<CalendarDays size={19} />}
              title="项目周期"
              trailing={
                <span className="day-badge">
                  {projectDays} <small>工作日</small>
                </span>
              }
            >
              <div className="two-column-fields">
                <InputField label="开始日期" type="date" value={startDate} onChange={setStartDate} />
                <InputField label="交付日期" type="date" value={endDate} onChange={setEndDate} />
              </div>
              <button
                className="soft-action"
                onClick={() =>
                  setMembers((items) =>
                    items.map((item) => ({ ...item, days: projectDays })),
                  )
                }
              >
                将 {projectDays} 个工作日填入全部成员
              </button>
            </GlassSection>

            <GlassSection
              icon={<Users size={19} />}
              title="项目成员"
              trailing={
                <button
                  className="add-button"
                  onClick={() =>
                    setMembers((items) => [
                      ...items,
                      { id: Date.now(), name: "", salary: 0, days: projectDays },
                    ])
                  }
                >
                  <Plus size={16} /> 添加成员
                </button>
              }
            >
              <div className="record-list">
                {members.map((member) => (
                  <div className="record-card member-card" key={member.id}>
                    <div className="library-field">
                      <label>成员 / 岗位</label>
                      <div className="library-input">
                        <input
                          aria-label="成员或岗位"
                          value={member.name}
                          onChange={(event) =>
                            updateMember(member.id, "name", event.target.value)
                          }
                        />
                        <button
                          className="library-button"
                          aria-label="打开成员库"
                          onClick={() =>
                            setOpenLibraryFor((current) =>
                              current === member.id ? null : member.id,
                            )
                          }
                        >
                          <UserRoundPlus size={17} />
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      {openLibraryFor === member.id && (
                        <div className="library-popover">
                          <p>成员库</p>
                          {MEMBER_LIBRARY.length === 0 && (
                            <p className="library-empty">暂无成员</p>
                          )}
                          {MEMBER_LIBRARY.map((person) => (
                            <button
                              key={person.name}
                              onClick={() => {
                                updateMember(member.id, "name", person.name);
                                updateMember(
                                  member.id,
                                  "salary",
                                  String(person.salary),
                                );
                                setOpenLibraryFor(null);
                              }}
                            >
                              <span>{person.name}</span>
                              <small>{money(person.salary)} / 月</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <InputField
                      label="月工资"
                      type="number"
                      value={String(member.salary)}
                      suffix="元"
                      onChange={(value) => updateMember(member.id, "salary", value)}
                    />
                    <InputField
                      label="投入天数"
                      type="number"
                      value={String(member.days)}
                      suffix="天"
                      onChange={(value) => updateMember(member.id, "days", value)}
                    />
                    <button
                      className="delete-button"
                      disabled={members.length === 1}
                      onClick={() =>
                        setMembers((items) =>
                          items.length === 1
                            ? items
                            : items.filter((item) => item.id !== member.id),
                        )
                      }
                    >
                      <Trash2 size={15} /> 删除
                    </button>
                  </div>
                ))}
              </div>
            </GlassSection>

            <GlassSection
              icon={<BriefcaseBusiness size={19} />}
              title="外部耗费"
              trailing={
                <button
                  className="add-button"
                  onClick={() =>
                    setExternalCosts((items) => [
                      ...items,
                      { id: Date.now(), category: "", owner: "", cost: 0 },
                    ])
                  }
                >
                  <Plus size={16} /> 添加费用
                </button>
              }
            >
              <div className="record-list">
                {externalCosts.map((item) => (
                  <div className="record-card external-card" key={item.id}>
                    <InputField
                      label="类目"
                      value={item.category}
                      onChange={(value) =>
                        updateExternal(item.id, "category", value)
                      }
                    />
                    <InputField
                      label="承接人 / 供应商"
                      value={item.owner}
                      onChange={(value) => updateExternal(item.id, "owner", value)}
                    />
                    <InputField
                      label="费用"
                      type="number"
                      value={String(item.cost)}
                      suffix="元"
                      onChange={(value) => updateExternal(item.id, "cost", value)}
                    />
                    <button
                      className="delete-button"
                      onClick={() =>
                        setExternalCosts((items) =>
                          items.filter((entry) => entry.id !== item.id),
                        )
                      }
                    >
                      <Trash2 size={15} /> 删除
                    </button>
                  </div>
                ))}
                {externalCosts.length === 0 && (
                  <p className="empty-records">暂无外部耗费，可点击右上角添加。</p>
                )}
              </div>
            </GlassSection>

            <GlassSection icon={<Cpu size={19} />} title="算力成本">
              <div className="compute-row">
                <InputField
                  label="与光 AI 积分消耗"
                  type="number"
                  value={String(credits)}
                  suffix="积分"
                  onChange={(value) => setCredits(Number(value))}
                />
                <div className="conversion-tile">
                  <span>换算成本</span>
                  <strong>{money(result.compute)}</strong>
                  <small>1 元 = {CREDITS_PER_RMB} 积分</small>
                </div>
              </div>
            </GlassSection>

            <GlassSection title="利润目标">
              <div className="slider-row">
                <input
                  aria-label="目标利润率"
                  type="range"
                  min="0"
                  max="90"
                  step="0.1"
                  value={margin}
                  onChange={(event) => setMargin(Number(event.target.value))}
                />
                <output>{marginLabel}%</output>
              </div>
              <div className="slider-scale">
                <span>保本 0%</span>
                <span>建议 50%</span>
                <span>上限 90%</span>
              </div>
            </GlassSection>
          </div>

          <aside className="quote-card">
            <div className="quote-top">
              <p>建议对外报价</p>
              <span>未税</span>
            </div>
            <div className="quote-options">
              <div className="quote-option">
                <span>不含风险预估</span>
                <output>{money(result.baseQuote)}</output>
                <small>目标利润率 {marginLabel}%</small>
              </div>
              <div className="quote-option featured">
                <span>含风险预估</span>
                <output className="quote-value">{money(result.beforeTax)}</output>
                <small>
                  含风险预估费用后利润率 {riskAdjustedMarginLabel}% · 风险预估 {riskRate}%
                </small>
              </div>
            </div>

            <div className="summary-list">
              <SummaryRow label="人工成本" value={money(result.labor)} />
              <SummaryRow label="外部耗费" value={money(result.external)} />
              <SummaryRow label="与光 AI 成本" value={money(result.compute)} />
              <SummaryRow
                label="项目总成本"
                value={money(result.totalCost)}
                strong
              />
              <SummaryRow label="预计利润" value={money(result.profit)} />
            </div>

            <div className="tax-panel">
              <div className="tax-control">
                <label htmlFor="risk-rate">风险预估费用</label>
                <div>
                  <input
                    id="risk-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={riskRate}
                    onChange={(event) =>
                      setRiskRate(Math.max(0, Number(event.target.value)))
                    }
                  />
                  <span>%</span>
                </div>
              </div>
              <SummaryRow label="风险预估费用" value={money(result.risk)} />
              <div className="tax-separator" />
              <div className="tax-control">
                <label htmlFor="tax-rate">税点</label>
                <div>
                  <input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(event) => setTaxRate(Number(event.target.value))}
                  />
                  <span>%</span>
                </div>
              </div>
              <SummaryRow label="税额" value={money(result.tax)} />
              <div className="after-tax">
                <label htmlFor="after-tax-quote">含税报价</label>
                <div className="after-tax-input">
                  <span>¥</span>
                  <input
                    id="after-tax-quote"
                    aria-label="含税报价"
                    type="number"
                    min="0"
                    step="1"
                    value={afterTaxDraft ?? Math.round(result.afterTax)}
                    onChange={(event) => updateAfterTaxQuote(event.target.value)}
                    onBlur={() => setAfterTaxDraft(null)}
                  />
                </div>
                <small>修改后将自动反算目标利润率</small>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function GlassSection({
  icon,
  title,
  trailing,
  children,
}: {
  icon?: ReactNode;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-section">
      <div className="section-header">
        <div className="section-title">
          {icon && <span className="section-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  suffix?: string;
}) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <div className="input-control">
        <input
          aria-label={label}
          type={type}
          min={type === "number" ? 0 : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "summary-row strong" : "summary-row"}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
