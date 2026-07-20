const { cached, D30, CENSUS_KEY } = require("./_util");
const FIPS = {AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",FL:"12",GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56"};
module.exports = async (req, res) => {
  try {
    const st = String(req.query.state || "").toUpperCase();
    const cd = String(req.query.cd ?? "");
    if (!FIPS[st]) return res.status(400).json({ error: "bad state" });
    const cdCode = (cd === "0" || cd === "AL") ? "00" : cd.padStart(2, "0");
    const data = await cached(`acs:${st}:${cdCode}`, D30, async () => {
      const vars = "DP05_0001E,DP03_0062E,DP02_0068PE,DP05_0018E,DP03_0128PE,DP04_0046PE";
      const key = CENSUS_KEY();
      const url = `https://api.census.gov/data/2023/acs/acs5/profile?get=${vars}&for=congressional%20district:${cdCode}&in=state:${FIPS[st]}${key ? "&key=" + key : ""}`;
      const rows = await (await fetch(url)).json();
      const v = rows[1];
      const n = x => (x == null || +x < 0) ? null : +x;
      return { profile: {
        "Population": n(v[0])?.toLocaleString("en-US"),
        "Median household income": n(v[1]) ? "$" + n(v[1]).toLocaleString("en-US") : null,
        "Bachelor's or higher": n(v[2]) != null ? n(v[2]) + "%" : null,
        "Median age": n(v[3]),
        "Poverty rate": n(v[4]) != null ? n(v[4]) + "%" : null,
        "Owner-occupied housing": n(v[5]) != null ? n(v[5]) + "%" : null
      }};
    });
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
