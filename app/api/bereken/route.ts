import { NextRequest, NextResponse } from 'next/server';

interface BerekenInput {
  jaren: number;
  maandbedrag: number;
}

interface BerekenResultaat {
  totaalIngelegd: number;
  waardeNaInflatie: number;
  eindwaarde: number;
  totaalIngelegdBeleggen: number;
  verschil: number;
}

const INFLATIE = 0.025;
const RENDEMENT = 0.10;

function berekenSparen(maandbedrag: number, jaren: number) {
  const maanden = jaren * 12;
  const totaalIngelegd = maandbedrag * maanden;
  const waardeNaInflatie = totaalIngelegd / Math.pow(1 + INFLATIE, jaren);
  return { totaalIngelegd, waardeNaInflatie };
}

function berekenBeleggen(maandbedrag: number, jaren: number) {
  const maanden = jaren * 12;
  const maandRendement = RENDEMENT / 12;
  const eindwaarde =
    maandbedrag * ((Math.pow(1 + maandRendement, maanden) - 1) / maandRendement);
  const totaalIngelegdBeleggen = maandbedrag * maanden;
  return { eindwaarde, totaalIngelegdBeleggen };
}

export async function POST(request: NextRequest) {
  try {
    const body: BerekenInput = await request.json();
    const { jaren, maandbedrag } = body;

    if (
      typeof jaren !== 'number' ||
      typeof maandbedrag !== 'number' ||
      jaren < 1 ||
      jaren > 30 ||
      maandbedrag < 5 ||
      maandbedrag > 100
    ) {
      return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 });
    }

    const sparen = berekenSparen(maandbedrag, jaren);
    const beleggen = berekenBeleggen(maandbedrag, jaren);

    const resultaat: BerekenResultaat = {
      totaalIngelegd: sparen.totaalIngelegd,
      waardeNaInflatie: sparen.waardeNaInflatie,
      eindwaarde: beleggen.eindwaarde,
      totaalIngelegdBeleggen: beleggen.totaalIngelegdBeleggen,
      verschil: beleggen.eindwaarde - sparen.waardeNaInflatie,
    };

    return NextResponse.json(resultaat);
  } catch {
    return NextResponse.json({ error: 'Berekening mislukt' }, { status: 500 });
  }
}
