// File: manav_visit_list.js
// Purpose: Visit list - each visit shows the lead stage it moved the lead to.
// Created: 2026-10-29
// CHANGE NOTE
// Date: 2026-10-30
// Change: Statuses are now Checked In (orange) / Checked Out (green), and visits still checked in have a
//         red Check Out button in their row (manav.visit_position, public/js/manav_visit_position.js).
// Reason: Visits were rebuilt like My Visit Monitor's visit entries.
// CHANGE NOTE
// Date: 2026-11-03
// Change: No Checked In / Checked Out status and no Check Out button; the indicator is the visit's stage.
// Reason: The user asked to remove the whole check-in and check-out system.
// CHANGE NOTE
// Date: 2026-11-12
// Change: Visit No. is a coloured "Visit #N" badge (same colour scale as the lead list's Visits:
//         1-2 orange, 3-4 blue, 5+ green) and Reason of Visit a badge with one colour per reason.
// Reason: The user asked to highlight the visit number and the reason of visit in the visit list.

// 2026-11-12: [background, text, icon] per Visit Type (visit_type options), shown as a badge too.
const MANAV_VISIT_TYPE_STYLE = {
	"Field Visit": ["#D9F5E3", "#16804A", "🚗"],
	"Phone Call": ["#DCEBFF", "#1D5FBF", "📞"],
	"Video Call": ["#EDE4FF", "#6A3FC4", "🎥"],
	"Customer at Our Office": ["#FFF0D9", "#B9640A", "🏢"],
	Email: ["#ECEEF1", "#4B5563", "✉️"],
	WhatsApp: ["#DCF8E8", "#128C4A", "💬"],
};

// [background, text] per Reason of Visit (visit_purpose options).
const MANAV_VISIT_REASON_COLOURS = {
	"New Enquiry": ["#DCEBFF", "#1D5FBF"],
	"Follow-up": ["#FFF0D9", "#B9640A"],
	Demo: ["#EDE4FF", "#6A3FC4"],
	Installation: ["#D9F5E3", "#16804A"],
	Service: ["#D8F3F3", "#137373"],
	"Payment Collection": ["#E2F6D5", "#3F7F12"],
	"Courtesy Visit": ["#FFE4EC", "#B23A62"],
	"Sales Promotion": ["#FFF6C9", "#8A6D00"],
	Others: ["#ECEEF1", "#4B5563"],
};

// [background, text] for a visit number.
function manav_visit_no_colours(n) {
	if (n <= 0) return ["#ECEEF1", "#4B5563"];
	if (n <= 2) return ["#FFF0D9", "#B9640A"];
	if (n <= 4) return ["#DCEBFF", "#1D5FBF"];
	return ["#D9F5E3", "#16804A"];
}

function manav_badge(text, [bg, fg], min_width) {
	return `<span style="display:inline-block;${min_width ? `min-width:${min_width}px;text-align:center;` : ""}padding:2px 10px;border-radius:10px;font-weight:600;font-size:12px;white-space:nowrap;background:${bg};color:${fg};">${text}</span>`;
}

frappe.listview_settings["Manav Visit"] = {
	add_fields: ["stage", "visit_no", "visit_purpose", "visit_type"],
	get_indicator(doc) {
		return doc.stage ? [__(doc.stage), "blue", `stage,=,${doc.stage}`] : [__("No stage"), "gray", "stage,is,not set"];
	},
	formatters: {
		visit_no(value) {
			const n = cint(value);
			// 2026-11-12: "Visit 6", no "#" (the user asked to remove it)
			return manav_badge(n ? __("Visit {0}", [n]) : "-", manav_visit_no_colours(n), 70);
		},
		visit_type(value) {
			if (!value) return "";
			const [bg, fg, icon] = MANAV_VISIT_TYPE_STYLE[value] || ["#ECEEF1", "#4B5563", ""];
			return manav_badge(`${icon} ${frappe.utils.escape_html(__(value))}`.trim(), [bg, fg]);
		},
		visit_purpose(value) {
			if (!value) return "";
			const colours = MANAV_VISIT_REASON_COLOURS[value] || MANAV_VISIT_REASON_COLOURS.Others;
			return manav_badge(frappe.utils.escape_html(__(value)), colours);
		},
	},
};
