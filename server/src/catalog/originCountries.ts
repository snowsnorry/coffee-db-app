// UN M49 geographic regions, retrieved 2026-09-14.
// https://unstats.un.org/unsd/methodology/m49/
// Alpha-2 codes: pycountry ISO 3166-1 snapshot. Northern America + Central America + Caribbean = North America.
export const originCountries: Record<string, string[]> = {
  africa:
    "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TF TG TN TZ UG YT ZA ZM ZW".split(
      " ",
    ),
  asia: "AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR UZ VN YE".split(
    " ",
  ),
  europe:
    "AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA".split(
      " ",
    ),
  oceania:
    "AS AU CC CK CX FJ FM GU HM KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS".split(
      " ",
    ),
  antarctica: "AQ".split(" "),
  north_america:
    "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI".split(
      " ",
    ),
  south_america: "AR BO BR BV CL CO EC FK GF GS GY PE PY SR UY VE".split(" "),
};
originCountries.americas = [
  ...originCountries.north_america!,
  ...originCountries.south_america!,
];
