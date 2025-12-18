import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import duckImg from "./assets/duck.png";
import duckSound from "./assets/ducksound.mp3";


/**
 * Rubber Duck Clicker
 * - Click duck => quacks (count++)
 * - Buy upgrades (unlocked by total quacks)
 * - Upgrades: +click power, +auto quacks/sec
 * - Persist to localStorage
 */

const STORAGE_KEY = "rubber_duck_clicker_v1";

function format(n) {
  // friendly compact formatting for big numbers
  if (n < 1000) return String(Math.floor(n));
  const units = ["K", "M", "B", "T"];
  let num = n;
  let i = -1;
  while (num >= 1000 && i < units.length - 1) {
    num /= 1000;
    i++;
  }
  return `${num.toFixed(num < 10 ? 2 : num < 100 ? 1 : 0)}${units[i]}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function App() {
  const [quacks, setQuacks] = useState(0); // current spendable
  const [totalQuacks, setTotalQuacks] = useState(0); // lifetime, for unlocks
  const [clickPower, setClickPower] = useState(1); // quacks per click
  const [autoQps, setAutoQps] = useState(0); // quacks per second
  const [owned, setOwned] = useState({}); // upgradeId -> count
  const lastQuackIntRef = useRef(0);

  const playQuack = () => {
  // new Audio instance each click = overlapping sounds allowed
  const a = new Audio(duckSound);
  a.volume = 0.6;
  a.play().catch(() => {
    // ignore autoplay errors (usually only happens if user hasn't interacted yet)
  });
};


  const [duckSquish, setDuckSquish] = useState(false);
  const [toast, setToast] = useState("");

  // Load saved
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data) return;

      setQuacks(Number(data.quacks ?? 0));
      setTotalQuacks(Number(data.totalQuacks ?? data.quacks ?? 0));
      setClickPower(Number(data.clickPower ?? 1));
      setAutoQps(Number(data.autoQps ?? 0));
      setOwned(data.owned ?? {});
    } catch {
      // ignore
    }
  }, []);
useEffect(() => {
  const currentInt = Math.floor(totalQuacks);
  const lastInt = lastQuackIntRef.current;

  if (currentInt > lastInt) {
    const times = currentInt - lastInt;

    // play one quack per increment
    for (let i = 0; i < times; i++) {
      playQuack();
    }

    lastQuackIntRef.current = currentInt;
  }
}, [totalQuacks]);


  // Save
  useEffect(() => {
    const data = { quacks, totalQuacks, clickPower, autoQps, owned };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [quacks, totalQuacks, clickPower, autoQps, owned]);

  const upgrades = useMemo(() => {
    // costs scale per purchase via costGrowth
    return [
      {
        id: "better_finger",
        name: "Stronger Finger",
        desc: "+1 quack per click",
        unlockAt: 0,
        baseCost: 25,
        costGrowth: 1.15,
        onBuy: () => setClickPower((p) => p + 1),
      },
      {
        id: "coffee",
        name: "Office Coffee",
        desc: "+0.5 auto-quacks/sec",
        unlockAt: 30,
        baseCost: 60,
        costGrowth: 1.17,
        onBuy: () => setAutoQps((q) => q + 0.5),
      },
      {
        id: "tiny_duck",
        name: "Tiny Desk Duck",
        desc: "+2 quacks per click",
        unlockAt: 120,
        baseCost: 180,
        costGrowth: 1.18,
        onBuy: () => setClickPower((p) => p + 2),
      },
      {
        id: "duck_army",
        name: "Duck Army",
        desc: "+3 auto-quacks/sec",
        unlockAt: 300,
        baseCost: 500,
        costGrowth: 1.2,
        onBuy: () => setAutoQps((q) => q + 3),
      },
      {
        id: "legendary_duck",
        name: "Legendary Duck",
        desc: "+10 quacks per click",
        unlockAt: 1200,
        baseCost: 2500,
        costGrowth: 1.22,
        onBuy: () => setClickPower((p) => p + 10),
      },
      {
        id: "ci_pipeline",
        name: "CI Pipeline Blessing",
        desc: "+15 auto-quacks/sec",
        unlockAt: 3000,
        baseCost: 7000,
        costGrowth: 1.25,
        onBuy: () => setAutoQps((q) => q + 15),
      },
    ];
  }, []);

  function getOwnedCount(id) {
    return Number(owned[id] ?? 0);
  }

  function upgradeCost(u) {
    const count = getOwnedCount(u.id);
    const cost = u.baseCost * Math.pow(u.costGrowth, count);
    return Math.ceil(cost);
  }

  // Auto-quacks loop (smooth-ish)
  const lastTickRef = useRef(performance.now());
  useEffect(() => {
    let rafId;

    const tick = (now) => {
      const last = lastTickRef.current;
      const dt = (now - last) / 1000;
      lastTickRef.current = now;

      if (autoQps > 0) {
        const gain = autoQps * dt;
        if (gain > 0) {
          setQuacks((q) => q + gain);
          setTotalQuacks((t) => t + gain);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoQps]);

function clickDuck() {
  setDuckSquish(true);
  window.setTimeout(() => setDuckSquish(false), 90);

  setQuacks((q) => q + clickPower);
  setTotalQuacks((t) => t + clickPower);
}



  function buyUpgrade(u) {
    const cost = upgradeCost(u);
    if (quacks < cost) {
      setToast("Not enough quacks 🦆");
      window.setTimeout(() => setToast(""), 900);
      return;
    }

    setQuacks((q) => q - cost);
    setOwned((o) => ({ ...o, [u.id]: getOwnedCount(u.id) + 1 }));
    u.onBuy();

    setToast(`Bought: ${u.name}`);
    window.setTimeout(() => setToast(""), 900);
  }

  function reset() {
    if (!window.confirm("Reset all duck progress?")) return;
    setQuacks(0);
    setTotalQuacks(0);
    setClickPower(1);
    setAutoQps(0);
    setOwned({});
    localStorage.removeItem(STORAGE_KEY);
  }

  // Unlock “milestones” for fun
  const title = useMemo(() => {
    const t = totalQuacks;
    if (t >= 5000) return "Duck Overlord";
    if (t >= 2000) return "Senior Quacker";
    if (t >= 800) return "Principal Duck";
    if (t >= 250) return "Rubber Duck Consultant";
    if (t >= 50) return "Junior Quacker";
    return "Intern Duck";
  }, [totalQuacks]);

  // Derived stats
  const shownQuacks = Math.floor(quacks);
  const shownTotal = Math.floor(totalQuacks);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Rubber Duck Clicker</h1>
          <p className="sub">Title: <span className="pill">{title}</span></p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="statLabel">Quacks</div>
            <div className="statValue">{format(shownQuacks)}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Total</div>
            <div className="statValue">{format(shownTotal)}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Per Click</div>
            <div className="statValue">{format(clickPower)}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Auto / sec</div>
            <div className="statValue">{autoQps.toFixed(1)}</div>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="centerCard">
          <div className="duckWrap">
<button
  className={"duckBtn " + (duckSquish ? "squish" : "")}
  onClick={clickDuck}
  aria-label="Click the rubber duck"
  title="Click the duck"
>
  <img
    src={duckImg}
    alt="Rubber Duck"
    className="duckImage"
    draggable="false"
  />
</button>


            <div className="hint">
              Click the duck to quack. Spend quacks on upgrades.
            </div>

            {toast && <div className="toast">{toast}</div>}
          </div>


        </section>

        <section className="shopCard">
          <div className="shopHeader">
            <h2>Upgrades</h2>
            <p className="shopSub">Unlocks are based on total quacks.</p>
          </div>

          <div className="shopList">
            {upgrades.map((u) => {
              const unlocked = shownTotal >= u.unlockAt;
              const cost = upgradeCost(u);
              const canAfford = quacks >= cost;

              return (
                <div
                  key={u.id}
                  className={"shopItem " + (unlocked ? "" : "locked")}
                >
                  <div className="shopTop">
                    <div className="shopTitle">
                      <div className="name">{u.name}</div>
                      <div className="desc">{u.desc}</div>
                    </div>

                    <div className="shopMeta">
                      <div className="owned">Owned: {getOwnedCount(u.id)}</div>
                      {!unlocked ? (
                        <div className="lockNote">
                          Unlock at {u.unlockAt} total
                        </div>
                      ) : (
                        <div className="cost">Cost: {format(cost)}</div>
                      )}
                    </div>
                  </div>

                  <button
                    className="buyBtn"
                    disabled={!unlocked || !canAfford}
                    onClick={() => buyUpgrade(u)}
                  >
                    {!unlocked ? "Locked" : canAfford ? "Buy" : "Need more quacks"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Pro tip: leave it open and let auto-quacks do their thing.</span>
      </footer>
    </div>
  );
}
