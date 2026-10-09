
import type { StaticGirlConfig } from "@/lib/types";

// INDIVIDUAL RESIDENT IMPORTS (Source of Truth)
import { Louise } from "./girls/Louise";
import { Chloe } from "./girls/Chloe";
import { Victoria } from "./girls/Victoria";
import { Natasha } from "./girls/Natasha";
import { Stevie } from "./girls/Stevie";
import { Sofia } from "./girls/Sofia";
import { Alishia } from "./girls/Alishia";
import { Charmaine } from "./girls/Charmaine";
import { Cara } from "./girls/Cara";
import { Izzy } from "./girls/Izzy";
import { Michelle } from "./girls/Michelle";
import { Melissa } from "./girls/Melissa";
import { Kate } from "./girls/Kate";
import { Sarah } from "./girls/Sarah";
import { Aaliyah } from "./girls/Aaliyah";
import { Emily } from "./girls/Emily";
import { Alice } from "./girls/Alice";
import { Nailah } from "./girls/Nailah";
import { Racheal } from "./girls/Racheal";
import { Hana } from "./girls/Hana";
import { Lucia } from "./girls/Lucia";
import { Daniela } from "./girls/Daniela";
import { Serafina } from "./girls/Serafina";
import { Bituin } from "./girls/Bituin";
import { Anya } from "./girls/Anya";

/**
 * @fileOverview Authoritative Resident Registry.
 * DIRECTIVE REMOVED: Static data files must not use "use server".
 */

export const allGirls: StaticGirlConfig[] = [
  Louise,
  Chloe,
  Victoria,
  Natasha,
  Stevie,
  Sofia,
  Alishia,
  Charmaine,
  Cara,
  Izzy,
  Michelle,
  Melissa,
  Kate,
  Sarah,
  Aaliyah,
  Emily,
  Alice,
  Nailah,
  Racheal,
  Hana,
  Lucia,
  Daniela,
  Serafina,
  Bituin,
  Anya
];
