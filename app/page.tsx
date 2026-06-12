'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    Chart?: any;
  }
}

interface BerekenResultaat {
  totaalIngelegd: number;
  waardeNaInflatie: number;
  eindwaarde: number;
  totaalIngelegdBeleggen: number;
  verschil: number;
  saldoNaInflatie: number;
}

function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(bedrag);
}

export default function SparenVsBeleggenPage() {
  const [huidigSaldo, setHuidigSaldo] = useState<number | ''>('');
  const [maandbedrag, setMaandbedrag] = useState<number>(10);
  const [jaren, setJaren] = useState<number>(15);
  const [resultaat, setResultaat] = useState<BerekenResultaat | null>(null);
  const [laden, setLaden] = useState<boolean>(true);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<any>(null);
  const [chartReady, setChartReady] = useState<boolean>(false);

  // Resultaat ophalen via beschermingslaag
  useEffect(() => {
    let actief = true;
    setLaden(true);
    setFoutmelding(null);

    fetch('/api/bereken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jaren, maandbedrag, huidigSaldo: huidigSaldo === '' ? 0 : huidigSaldo }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Berekening mislukt');
        return res.json();
      })
      .then((data: BerekenResultaat) => {
        if (actief) {
          setResultaat(data);
          setLaden(false);
        }
      })
      .catch(() => {
        if (actief) {
          setFoutmelding('Er ging iets mis bij het berekenen. Probeer de schuiven opnieuw.');
          setLaden(false);
        }
      });

    return () => {
      actief = false;
    };
  }, [jaren, maandbedrag, huidigSaldo]);

  // Chart.js laden via CDN
  useEffect(() => {
    if (window.Chart) {
      setChartReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => setChartReady(true);
    document.body.appendChild(script);
  }, []);

  const tekenChart = useCallback(() => {
    if (!chartRef.current || !window.Chart || !resultaat) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: [['Ingelegd'], ['Spaargeld', 'na inflatie'], ['Belegd', 'vermogen']],
        datasets: [
          {
            data: [
              resultaat.totaalIngelegd,
              resultaat.waardeNaInflatie,
              resultaat.eindwaarde,
            ],
            backgroundColor: ['#1A1F36', '#FF6B35', '#3EDCB1'],
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item: any) => formatEuro(item.raw),
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val: any) => formatEuro(Number(val)),
              font: { family: 'Lora', size: 11 },
              color: '#1A1F36',
            },
            grid: { color: '#eee' },
          },
          x: {
            ticks: {
              font: { family: 'Montserrat', size: 12, weight: '700' },
              color: '#1A1F36',
            },
            grid: { display: false },
          },
        },
      },
    });
  }, [resultaat]);

  useEffect(() => {
    if (chartReady && resultaat) tekenChart();
  }, [chartReady, resultaat, tekenChart]);

  const kleinVerschil = resultaat ? resultaat.verschil < 200 : false;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&family=Lora:ital,wght@0,400;1,400&family=Pacifico&display=swap');
        html, body { margin: 0 !important; padding: 0 !important; background: #F7F7FA !important; }
        * { box-sizing: border-box; }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: #E8E5F0;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #E21B70;
          border: 4px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #E21B70;
          border: 4px solid #FFFFFF;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          cursor: pointer;
        }

        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        input[type="number"]:focus {
          outline: none;
        }
        input[type="number"]::placeholder {
          color: #999;
          font-weight: 600;
        }
      `}</style>

      <div style={styles.wrapper}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>Sparen of beleggen?</div>
          <div style={styles.headerSub}>Ontdek wat jouw geld doet als je het laat groeien</div>
        </div>

        {/* INVOER */}
        <div style={styles.card}>
          <div style={styles.sliderRow}>
            <div style={styles.sliderLabel}>Saldo van spaargeld op je spaarrekening</div>
            <div style={styles.inputWrapper}>
              <span style={styles.inputPrefix}>€</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000"
                step="100"
                placeholder="Bijvoorbeeld 5.000"
                value={huidigSaldo}
                onChange={(e) => {
                  const ruw = e.target.value;
                  if (ruw === '') {
                    setHuidigSaldo('');
                    return;
                  }
                  const waarde = Number(ruw);
                  setHuidigSaldo(Number.isNaN(waarde) ? '' : Math.max(0, Math.min(1000000, waarde)));
                }}
                style={styles.inputField}
              />
            </div>
          </div>

          <div style={styles.sliderRow}>
            <div style={styles.sliderLabel}>
              Hoeveel spaar je per maand? <span style={styles.sliderValue}>{formatEuro(maandbedrag)}</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={maandbedrag}
              onChange={(e) => setMaandbedrag(Number(e.target.value))}
            />
          </div>

          <div style={{ ...styles.sliderRow, marginBottom: 0 }}>
            <div style={styles.sliderLabel}>
              Over hoeveel jaar wil je je vermogen bekijken?{' '}
              <span style={styles.sliderValue}>{jaren} jaar</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={jaren}
              onChange={(e) => setJaren(Number(e.target.value))}
            />
          </div>
        </div>

        {foutmelding && <div style={styles.errorBlock}>{foutmelding}</div>}

        {laden && !resultaat && (
          <div style={styles.loadingBlock}>Bezig met rekenen...</div>
        )}

        {resultaat && (
          <>
            {/* SPAREN UITLEG */}
            <div style={styles.infoBlock}>
              <div style={styles.infoIcon}>💸</div>
              <div>
                <div style={styles.infoTitle}>
                  Spaargeld verliest elk jaar waarde door inflatie.
                </div>
                <div style={styles.infoText}>
                  Je legt elke maand {formatEuro(maandbedrag)} opzij. Na {jaren} jaar heb je{' '}
                  <strong>{formatEuro(resultaat.totaalIngelegd)}</strong> gespaard. Klinkt goed,
                  toch? Maar door inflatie van <strong>2,5% per jaar</strong> kun je daar straks
                  minder mee kopen. In waarde van vandaag is dat nog maar{' '}
                  <strong style={{ color: '#FF6B35' }}>
                    {formatEuro(resultaat.waardeNaInflatie)}
                  </strong>
                  .
                </div>
                <div style={styles.warningBlock}>
                  Let op: een inflatie van <strong>2%</strong> per jaar is <strong>normaal</strong>.
                  Maar inflatie kan ook <strong>jarenlang hoger</strong> liggen, zoals je de
                  afgelopen jaren hebt gezien. Hoe hoger de inflatie, hoe <strong>sneller</strong>{' '}
                  je spaargeld zijn waarde verliest.
                </div>
              </div>
            </div>

            {/* HUIDIG SPAARSALDO */}
            {typeof huidigSaldo === 'number' && huidigSaldo > 0 && (
              <div style={styles.card}>
                <div style={styles.chartTitle}>Wat doet inflatie met jouw spaarsaldo?</div>
                <div style={styles.resultRowInner}>
                  <div style={styles.resultCard}>
                    <div style={styles.resultLabel}>Huidig spaarsaldo</div>
                    <div style={{ ...styles.resultValue, color: '#1A1F36' }}>
                      {formatEuro(huidigSaldo)}
                    </div>
                  </div>
                  <div style={styles.resultCard}>
                    <div style={styles.resultLabel}>Waard over {jaren} jaar</div>
                    <div style={{ ...styles.resultValue, color: '#FF6B35' }}>
                      {formatEuro(resultaat.saldoNaInflatie)}
                    </div>
                  </div>
                </div>
                <div style={styles.noteText}>
                  Dit saldo is <strong>niet</strong> meegerekend bij beleggen hieronder. Dat gaat
                  alleen over je maandelijkse inleg.
                </div>
              </div>
            )}

            {/* BELEGGEN UITLEG */}
            <div style={styles.infoBlockDark}>
              <div style={styles.infoIcon}>🚀</div>
              <div>
                <div style={styles.infoTitleLight}>Beleggen laat je geld voor je werken.</div>
                <div style={styles.infoTextLight}>
                  Stop je datzelfde bedrag elke maand in beleggingen met gemiddeld{' '}
                  <strong>10% rendement per jaar</strong>, dan kan je inleg groeien van{' '}
                  {formatEuro(resultaat.totaalIngelegdBeleggen)} naar maar liefst{' '}
                  <strong style={{ color: '#3EDCB1' }}>
                    {formatEuro(resultaat.eindwaarde)}
                  </strong>{' '}
                  na {jaren} jaar.
                </div>
              </div>
            </div>

            {/* CHART */}
            <div style={styles.card}>
              <div style={styles.chartTitle}>Het verschil in één oogopslag</div>
              <div style={{ position: 'relative', height: '260px', width: '100%' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>

            {/* CIJFERS */}
            <div style={styles.resultRow}>
              <div style={styles.resultCard}>
                <div style={styles.resultLabel}>Spaargeld na inflatie</div>
                <div style={{ ...styles.resultValue, color: '#FF6B35' }}>
                  {formatEuro(resultaat.waardeNaInflatie)}
                </div>
              </div>
              <div style={styles.resultCard}>
                <div style={styles.resultLabel}>Belegd vermogen</div>
                <div style={{ ...styles.resultValue, color: '#3EDCB1' }}>
                  {formatEuro(resultaat.eindwaarde)}
                </div>
              </div>
            </div>

            <div style={styles.diffBlock}>
              <div style={styles.diffLabel}>Door te beleggen kun je</div>
              <div style={styles.diffValue}>{formatEuro(resultaat.verschil)}</div>
              <div style={styles.diffLabel}>meer hebben dan met sparen</div>
            </div>

            {kleinVerschil && (
              <div style={styles.hintBlock}>
                Klein bedrag, klein verschil. Maar wacht maar tot je dit jarenlang volhoudt, dan
                wordt het verschil groot.
              </div>
            )}
          </>
        )}

        <div style={styles.footer}>
          Let op: dit is een rekenvoorbeeld. Ook bij beleggen knaagt inflatie, maar het
          rendement ligt veel hoger. Rendementen uit het verleden bieden geen garantie voor de
          toekomst.
        </div>

        <div style={styles.brandFooter}>
          <div style={styles.brandFooterText}>
            <a href="https://claudiavoogt.nl" target="_blank" rel="noopener noreferrer" style={styles.brandFooterLink}>
              claudiavoogt.nl
            </a>
            {' '}— Beleggingsexpert &amp; investeringsmentor
          </div>
          <div style={styles.brandFooterCopy}>
            © 2026 Claudia Voogt. Alle rechten voorbehouden. Deze tool mag niet worden gedeeld, gekopieerd, nagebouwd of hergebruikt zonder schriftelijke toestemming.
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    width: '100%',
    minHeight: '100vh',
    background: '#F7F7FA',
    fontFamily: 'Lora, serif',
    display: 'flex',
    justifyContent: 'center',
    padding: '0 0 32px 0',
  },
  wrapper: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  logoBlock: {
    background: '#FFFFFF',
    padding: '20px 24px',
    textAlign: 'center',
  },
  logoImg: {
    width: '55%',
    maxWidth: '220px',
    height: 'auto',
    display: 'inline-block',
  },
  header: {
    background: 'linear-gradient(135deg, #1A1F36 0%, #6B2D84 100%)',
    padding: '28px 24px',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '24px',
    marginBottom: '6px',
  },
  headerSub: {
    fontFamily: 'Lora, serif',
    fontStyle: 'italic',
    fontSize: '14px',
    opacity: 0.9,
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    margin: '0 16px',
    boxShadow: '0 2px 10px rgba(26,31,54,0.06)',
  },
  sliderRow: {
    marginBottom: '20px',
  },
  sliderLabel: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '14px',
    color: '#1A1F36',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  sliderValue: {
    color: '#E21B70',
    fontWeight: 800,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: '#F7F7FA',
    borderRadius: '12px',
    border: '2px solid #E8E5F0',
    padding: '12px 14px',
  },
  inputPrefix: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '16px',
    color: '#6B2D84',
    marginRight: '8px',
  },
  inputField: {
    border: 'none',
    background: 'transparent',
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '16px',
    color: '#1A1F36',
    width: '100%',
  },
  errorBlock: {
    margin: '0 16px',
    background: '#FFE3E3',
    border: '2px solid #E21B70',
    borderRadius: '16px',
    padding: '16px',
    fontFamily: 'Lora, serif',
    fontSize: '13px',
    color: '#1A1F36',
    textAlign: 'center',
  },
  loadingBlock: {
    margin: '0 16px',
    fontFamily: 'Lora, serif',
    fontStyle: 'italic',
    fontSize: '13px',
    color: '#999',
    textAlign: 'center',
    padding: '12px',
  },
  infoBlock: {
    margin: '0 16px',
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    border: '2px solid #FFE3D1',
    boxShadow: '0 2px 10px rgba(26,31,54,0.06)',
  },
  infoBlockDark: {
    margin: '0 16px',
    background: 'linear-gradient(135deg, #1A1F36 0%, #6B2D84 100%)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: '28px',
    lineHeight: '1',
  },
  infoTitle: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '15px',
    color: '#1A1F36',
    marginBottom: '6px',
  },
  infoText: {
    fontFamily: 'Lora, serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#1A1F36',
  },
  warningBlock: {
    marginTop: '12px',
    padding: '12px 14px',
    background: '#FFE3E3',
    border: '2px solid #E21B70',
    borderRadius: '12px',
    fontFamily: 'Lora, serif',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#B72452',
  },
  infoTitleLight: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '15px',
    color: '#FFFFFF',
    marginBottom: '6px',
  },
  infoTextLight: {
    fontFamily: 'Lora, serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#F7F7FA',
  },
  chartTitle: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '15px',
    color: '#1A1F36',
    marginBottom: '14px',
    textAlign: 'center',
  },
  resultRow: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '12px',
    margin: '0 16px',
  },
  resultRowInner: {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '12px',
    marginBottom: '14px',
  },
  resultCard: {
    flex: 1,
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(26,31,54,0.06)',
  },
  resultLabel: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 700,
    fontSize: '12px',
    color: '#1A1F36',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  resultValue: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '20px',
  },
  noteText: {
    fontFamily: 'Lora, serif',
    fontStyle: 'italic',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#6B2D84',
    textAlign: 'center',
  },
  diffBlock: {
    margin: '0 16px',
    background: 'linear-gradient(135deg, #E21B70 0%, #6B2D84 100%)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  diffLabel: {
    fontFamily: 'Lora, serif',
    fontStyle: 'italic',
    fontSize: '14px',
  },
  diffValue: {
    fontFamily: 'Montserrat, sans-serif',
    fontWeight: 800,
    fontSize: '32px',
    margin: '4px 0',
    color: '#3EDCB1',
  },
  hintBlock: {
    margin: '0 16px',
    background: '#FFF3E8',
    border: '2px dashed #FF6B35',
    borderRadius: '16px',
    padding: '16px',
    fontFamily: 'Lora, serif',
    fontStyle: 'italic',
    fontSize: '13px',
    color: '#1A1F36',
    textAlign: 'center',
  },
  footer: {
    margin: '0 16px',
    fontFamily: 'Lora, serif',
    fontStyle: 'italic',
    fontSize: '11px',
    color: '#999',
    textAlign: 'center',
  },
  brandFooter: {
    background: 'linear-gradient(110deg, #1A1F36 0%, #6B2D84 70%, #3EDCB1 100%)',
    padding: '24px 20px',
    textAlign: 'center',
    marginTop: '8px',
  },
  brandFooterText: {
    fontFamily: 'Lora, serif',
    fontSize: '13px',
    color: '#cdbcd9',
  },
  brandFooterLink: {
    color: '#3EDCB1',
    textDecoration: 'underline',
  },
  brandFooterCopy: {
    fontFamily: 'Lora, serif',
    fontSize: '11px',
    color: '#ffffff',
    opacity: 0.9,
    marginTop: '6px',
  },
};
