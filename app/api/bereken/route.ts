import { NextRequest, NextResponse } from 'next/server';

interface BerekenInput {
  jaren: number;
  maandbedrag: number;
  huidigSaldo: number;
  inflatie: number;   // percentage, bijv. 3.5
  spaarrente: number; // percentage, bijv. 1.5
}

interface BerekenResultaat {
  totaalIngelegd: number;
  eindwaardeSparenNominaal: number;
  waardeNaInflatie: number;
  eindwaarde: number;
  totaalIngelegdBeleggen: number;
  verschil: number;
  saldoNominaal: number;
  saldoNaInflatie: number;
  saldoBelegd: number;
}

const RENDEMENT = 0.10;

function berekenSparen(
  maandbedrag: number,
  jaren: number,
  spaarrente: number,
  inflatie: number
) {
  const maanden = jaren * 12;
  const totaalIngelegd = maandbedrag * maanden;

  let eindwaardeSparenNominaal: number;
  if (spaarrente === 0) {
    eindwaardeSparenNominaal = totaalIngelegd;
  } else {
    const maandRente = spaarrente / 12;
    eindwaardeSparenNominaal =
      maandbedrag * ((Math.pow(1 + maandRente, maanden) - 1) / maandRente);
  }

  const waardeNaInflatie =
    eindwaardeSparenNominaal / Math.pow(1 + inflatie, jaren);

  return { totaalIngelegd, eindwaardeSparenNominaal, waardeNaInflatie };
}

function berekenBeleggen(maandbedrag: number, jaren: number) {
  const maanden = jaren * 12;
  const maandRendement = RENDEMENT / 12;
  const eindwaarde =
    maandbedrag *
    ((Math.pow(1 + maandRendement, maanden) - 1) / maandRendement);
  const totaalIngelegdBeleggen = maandbedrag * maanden;
  return { eindwaarde, totaalIngelegdBeleggen };
}

function berekenSaldo(
  huidigSaldo: number,
  jaren: number,
  spaarrente: number,
  inflatie: number
) {
  const saldoNominaal = huidigSaldo * Math.pow(1 + spaarrente, jaren);
  const saldoNaInflatie = saldoNominaal / Math.pow(1 + inflatie, jaren);
  return { saldoNominaal, saldoNaInflatie };
}

export async function POST(request: NextRequest) {
  try {
    const body: BerekenInput = await request.json();
    const { jaren, maandbedrag, huidigSaldo, inflatie, spaarrente } = body;

    if (
      typeof jaren !== 'number' ||
      typeof maandbedrag !== 'number' ||
      typeof huidigSaldo !== 'number' ||
      typeof inflatie !== 'number' ||
      typeof spaarrente !== 'number' ||
      jaren < 1 ||
      jaren > 30 ||
      maandbedrag < 0 ||
      maandbedrag > 1000 ||
      huidigSaldo < 0 ||
      huidigSaldo > 1000000 ||
      inflatie < 0 ||
      inflatie > 10 ||
      spaarrente < 0 ||
      spaarrente > 5
    ) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 });
    }

    const inflatieDecimaal = inflatie / 100;
    const spaarrenteDecimaal = spaarrente / 100;

    const sparen = berekenSparen(maandbedrag, jaren, spaarrenteDecimaal, inflatieDecimaal);
    const beleggen = berekenBeleggen(maandbedrag, jaren);
    const saldo = berekenSaldo(huidigSaldo, jaren, spaarrenteDecimaal, inflatieDecimaal);

    const resultaat: BerekenResultaat = {
      totaalIngelegd: sparen.totaalIngelegd,
      eindwaardeSparenNominaal: sparen.eindwaardeSparenNominaal,
      waardeNaInflatie: sparen.waardeNaInflatie,
      eindwaarde: beleggen.eindwaarde,
      totaalIngelegdBeleggen: beleggen.totaalIngelegdBeleggen,
      verschil: beleggen.eindwaarde - sparen.waardeNaInflatie,
      saldoNominaal: saldo.saldoNominaal,
      saldoNaInflatie: saldo.saldoNaInflatie,
      saldoBelegd: huidigSaldo * Math.pow(1 + RENDEMENT, jaren),
    };

    return NextResponse.json(resultaat);
  } catch {
    return NextResponse.json({ error: 'Berekening mislukt' }, { status: 500 });
  }
}
