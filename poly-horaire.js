export default async () => {
  let wrapper = document.querySelector(".wrapperPourListeCoursActuels");

  let cours = [];

  for (let rangee of wrapper.children) {
    let [heure, minute] = rangee.firstChild.lastChild.innerText
      .trim()
      .split("h")
      .map((x) => parseInt(x, 10));

    for (let i = 1; i < 8; i++) {
      for (let elem of rangee.children[i].querySelectorAll(".inputEmulator")) {
        let periodeInfo = elem.innerText.trim();
        if (!periodeInfo) continue;

        let existant = cours.find(
          (c) => c.info == periodeInfo && c.jour == i && c.heureFin == heure
        );
        if (existant) {
          existant.heureFin++;
          continue;
        }

        let semaine = null;
        let match = periodeInfo.match(/\(B([1-2])\)/);
        if (match) semaine = Number(match[1]);

        cours.push({
          info: periodeInfo,
          jour: i % 7,
          heureDebut: heure,
          heureFin: heure + 1,
          minute: minute,
          semaine: semaine,
        });
      }
    }
  }
  let formatDate = (d) => d.toISOString().split(".")[0].replace(/-|:/g, "");

  let sessionInfo = document
    .querySelector(".colSoustitreDroite .sousTitre")
    .innerText.trim()
    .split(" ");
  let session = sessionInfo[2] + sessionInfo[1];

  let calendrierInfo;
  try {
    let res = await fetch(
      `https://nico14916.github.io/PolyHoraireICS/sessions/${session}.txt`
    );
    calendrierInfo = await res.text();
  } catch (err) {
    console.log(err);
    return;
  }

  let calendrier = calendrierInfo.split(/\n|,/);
  let date = new Date(calendrier[0]);
  let stamp = formatDate(new Date());

  let ical = [];
  ical.push(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hacksw/handcal//NONSGML v1.0//EN`);

  for (let i = 1; i < calendrier.length; i++) {
    if (!calendrier[i]) continue;
    if (calendrier[i] == "X") {
      date.setUTCDate(date.getUTCDate() + 1);
      continue;
    }
    let jourInfo = calendrier[i].split(":");
    let jour = date.getUTCDay();
    if (jourInfo[1]) jour = Number(jourInfo[1]);
    let coursJournee = cours.filter(
      (e) => e.jour == jour && (!e.semaine || e.semaine == jourInfo[0])
    );

    for (let c of coursJournee) {
      date.setUTCHours(c.heureDebut);
      date.setMinutes(c.minute);
      let debut = formatDate(date);
      date.setUTCHours(c.heureFin);
      let fin = formatDate(date);
      ical.push(`
BEGIN:VEVENT
UID:${debut}@calendrier.poly
SUMMARY:${c.info.split("\n").join(" ")}
DTSTAMP:${stamp}
DTSTART:${debut}
DTEND:${fin}
END:VEVENT`);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  ical.push(`
END:VCALENDAR`);

  const blob = new Blob(ical, { type: "text/calendar" });
  const elem = window.document.createElement("a");
  elem.href = window.URL.createObjectURL(blob);
  elem.download = "horaire.ics";
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
};
