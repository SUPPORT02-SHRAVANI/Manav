app_name = "manav"
app_title = "Manav"
app_publisher = "milind"
app_description = "Manav quotation "
app_email = "support02@softworld.co.in"
app_license = "mit"

# Apps
# ------------------

# CHANGE NOTE
# Date: 2026-10-15
# Change: ERPNext is a required app.
# Reason: Manav adds fields to and code on ERPNext's Quotation, Item and Customer; installing it on
# a site without ERPNext (e.g. through Frappe Cloud) must be refused rather than half work.
required_apps = ["frappe/erpnext"]

# CHANGE NOTE
# Date: 2026-10-19
# Change: Manav is an app on the apps screen, opening the Manav workspace; it is made the Default
# App in System Settings (manav.manav.desk_home.set_default_app in after_migrate below).
# Reason: The user asked for the Manav page to be the page shown after login.
#
# CHANGE NOTE
# Date: 2026-10-19
# Change: The route is the Manav dashboard (/manav-dashboard), which shows each user their own
# figures, instead of the Manav workspace.
# Reason: The user asked that everyone sees their own dashboard after login.
#
# CHANGE NOTE
# Date: 2026-10-22
# Change: The route is the Manav workspace (/desk/manav) again, so users land on it after login
# and after setting their password (Frappe sends them to the Default App's route). The dashboard
# page stays reachable from the workspace. An admin who wants another landing page picks another
# Default App in their own User form (it wins over System Settings).
# Reason: The user asked that everyone except the admin opens the Manav workspace after login,
# not the web page /manav-dashboard.
#
# CHANGE NOTE
# Date: 2026-10-28
# Change: The route is the Manav Dashboard desk page (/desk/manav-dashboard), so users land on it
# after login; the workspace stays in the sidebar.
# Reason: The user asked for the Manav dashboard to open directly after login (it has been a desk
# page since 2026-10-22, so it opens inside the desk).
add_to_apps_screen = [
	{
		"name": "manav",
		"logo": "/assets/manav/images/manav_logo.svg",
		"title": "Manav",
		# 2026-10-28: the Manav Dashboard desk page after login (10-22 to 10-27: /desk/manav)
		"route": "/desk/manav-dashboard",
		"has_permission": "manav.manav.desk_home.has_app_permission",
	}
]

# CHANGE NOTE
# Date: 2026-10-22
# Change: Users other than the Administrator and System Managers see only the Manav workspace,
# sidebar and app in the desk (manav.manav.desk_home.limit_desk_to_manav).
# Reason: The user asked that everyone except the admin sees only the Manav workspace.
# CHANGE NOTE
# Date: 2026-11-03
# Change: Also manav.manav.branches.add_branch_to_boot: the user's branch (User > Branch) for the
# desk, shown beside the page title by public/js/manav_branch.js (app_include_js below).
# Reason: The user asked for the branch name beside the "Manav" title at the top of the page.
extend_bootinfo = [
	"manav.manav.desk_home.limit_desk_to_manav",
	"manav.manav.branches.add_branch_to_boot",
]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "manav",
# 		"logo": "/assets/manav/logo.png",
# 		"title": "Manav",
# 		"route": "/manav",
# 		"has_permission": "manav.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/manav/css/manav.css"
# app_include_js = "/assets/manav/js/manav.js"
# 2026-11-03: the user's branch beside the page title (served as it is, without Frappe's build;
# the "?v=" changes with the file so browsers fetch the new copy)
app_include_js = [
	# 2026-11-04: v=20261104-1, the file also leaves Manav out of the sidebar's Modules list
	"/assets/manav/js/manav_branch.js?v=20261104-1",
	# 2026-11-04: rich-text editors: Undo / Redo buttons, and the text handed over before a save
	# (a colour picked just before Save was lost)
	"/assets/manav/js/manav_text_editor.js?v=20261104-1",
]

# include js, css files in header of web template
# web_include_css = "/assets/manav/css/manav.css"
# CHANGE NOTE
# Date: 2026-10-28
# Change: The login page's look in Manav's blue (public/css/login.css; only the login page).
# Reason: The user asked for a better looking login page.
# CHANGE NOTE
# Date: 2026-10-28
# Change: login.css keeps only the size of the company logo; Frappe's default login look is back.
# Reason: The user asked for the default login page with the company logo shown properly.
# The "?v=" changes whenever login.css changes, so browsers fetch the new file instead of a cached
# copy (the file is served as it is, without Frappe's build, so it has no version of its own).
web_include_css = "/assets/manav/css/login.css?v=20261028-2"
# CHANGE NOTE
# Date: 2026-10-22
# Change: A "Request access" link on the login page, opening the sign-up page /manav-signup.
# Reason: The user asked for a sign-up page whose requests the managers approve (signup.py).
web_include_js = "/assets/manav/js/login_signup_link.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "manav/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}
# CHANGE NOTE
# Date: 2026-11-02
# Change: Frappe's Print page gets a left sidebar like the design the user pointed to
# (public/js/manav_print_sidebar.js): Format, Style, Font, Page, the doctype's options as switches and
# "Set as default". The print formats are not changed.
# Reason: The user asked for that left sidebar only ("vo left sidebar chahiye mujhe bas").
page_js = {"print": "public/js/manav_print_sidebar.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "manav/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "manav.utils.jinja_methods",
# 	"filters": "manav.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "manav.install.before_install"
# after_install = "manav.install.after_install"

# CHANGE NOTE
# Date: 2026-10-12
# Change: Create the Manav custom fields on the inbuilt Customer doctype after every migrate.
# Reason: The old customer master has columns that ERPNext's Customer does not have, and the
# Customer doctype itself belongs to ERPNext and must not be edited.
#
# CHANGE NOTE
# Date: 2026-10-12
# Change: Also create the Manav custom fields on the inbuilt Item doctype after every migrate.
# Reason: The old items are loaded into ERPNext's Item, which has no field for the Quotation Type
# and the old rate.
#
# CHANGE NOTE
# Date: 2026-10-12
# Change: Also create the Manav custom fields on ERPNext's Quotation, Quotation Item, Sales Person
# and Contact (erpnext_fields). Added doctype_js and doc_events for Quotation below.
# Reason: Quotations are now made in ERPNext's own Quotation form instead of Quotation Head.
#
# CHANGE NOTE
# Date: 2026-10-13
# Change: Also create the principals' Letter Heads and set them on their Quotation Types
# (letter_heads).
# Reason: The machine quotations are to print with the Haas Factory Outlet header.
after_migrate = [
	"manav.manav.customer_fields.setup_customer_fields",
	"manav.manav.item_fields.setup_item_fields",
	"manav.manav.erpnext_fields.setup_erpnext_fields",
	"manav.manav.letter_heads.setup_letter_heads",
	# 2026-10-29: "Draft PI" in ERPNext's Selling sidebar, between Quotation and Sales Order
	"manav.manav.desk_home.add_draft_pi_to_selling_sidebar",
	# 2026-10-28: the branches Manav Marketing - Bangalore (head office), FTWZ, Chennai, Coimbatore
	"manav.manav.branches.setup_branches",
	# 2026-10-19: Manav as the Default App, so users land on the Manav workspace after login.
	"manav.manav.desk_home.set_default_app",
	# 2026-10-28: App Name "Manav Marketing" (the site's name, e.g. in login e-mails)
	"manav.manav.desk_home.set_app_name",
	# 2026-10-19: the role that sees all employees' figures (dashboard tabs, workspace team charts)
	"manav.manav.desk_home.setup_management_role",
	# 2026-10-19: the tab bar of the Manav workspace (Custom HTML Block, see workspace_tabs.py)
	"manav.manav.workspace_tabs.setup_workspace_tabs",
	# 2026-10-19: Job Offer fields for the print format Manav Appointment Letter (HRMS only)
	"manav.manav.job_offer_fields.setup_job_offer_fields",
	# 2026-10-22: support@ e-mail account, the managers' logins and the staff's access requests
	# (after setup_management_role, whose role the managers get)
	"manav.manav.signup.setup_signup",
	# 2026-10-29: seed the Lead Management dropdown masters (Lead Sources and Product Types) with the
	# Haas LMS values (217.79.180.219/lms); only adds what is missing.
	"manav.manav.lead_setup.setup_lead_masters",
	# 2026-11-02: Stage / Next Follow-up on the lead and Stage / Lead Status on the DVR (Manav Visit),
	# as custom fields (lead_board.py); after setup_lead_masters, which seeds the stages.
	"manav.manav.lead_board.setup_lead_board_fields",
]

# CHANGE NOTE
# Date: 2026-10-15
# Change: The same setup also runs right after the app is installed on a site.
# Reason: Installing the app (e.g. on Frappe Cloud) does not run a migrate, so the custom fields,
# letter heads and the Quotation settings were missing until the site was migrated by hand.
after_install = list(after_migrate)

# Manav's screen logic on ERPNext's Quotation form: principal defaults, item filter, Add Options.
# Item: the "Format Pasted Specifications" button (added 2026-10-12, so that a specification table
# copied from the manufacturer's site can be turned into the lines the quotation prints).
# CHANGE NOTE
# Date: 2026-10-19
# Change: Job Offer (HRMS): a new offer starts with the salary rows of the appointment letter
# (public/js/job_offer.js).
# Reason: The user asked for an appointment letter like the May 2026 offer letter.
# CHANGE NOTE
# Date: 2026-10-28
# Change: Sales Order (the PI: Draft PI until submitted, Final PI once submitted) loads the same
# quotation.js, which registers its handlers for both forms once (sub-items, item search, rates).
# Reason: The user asked for Quotation -> Draft PI -> Final PI, with items and sub-items editable in
# the draft.
# CHANGE NOTE
# Date: 2026-10-30
# Change: Manav Visit's form and list load public/js/manav_visit_position.js (GPS for check-in / check-out).
# Reason: Visits were rebuilt like My Visit Monitor; the list's Check Out button needs the same helper.
# CHANGE NOTE
# Date: 2026-11-03
# Change: Customer's form loads public/js/customer.js: a "Customer Dashboard" button (management).
# Reason: The user asked for the customer dashboard on the Customer form.
# CHANGE NOTE
# Date: 2026-11-03
# Change: Manav Visit no longer loads manav_visit_position.js (form and list): check-in / check-out removed.
# Reason: The user asked to remove the whole check-in and check-out system.
doctype_js = {
	"Customer": "public/js/customer.js",
	# 2026-11-04: with the Standard Accessories table under the Items (standard_accessories.js)
	"Quotation": ["public/js/quotation.js", "public/js/standard_accessories.js"],
	"Sales Order": ["public/js/quotation.js", "public/js/standard_accessories.js"],
	"Draft PI": "public/js/standard_accessories.js",
	"Item": "public/js/item.js",
	"Job Offer": "public/js/job_offer.js",
	# 2026-11-02: the DVR's Stage / Lead Status start from the lead's; a stage sets the Next Visit Date;
	# in the RFQ stage the DVR and the lead have Make Quotation (manav_lead_quotation.js)
	# 2026-11-04: no manav_photo.js any more (the visit has no photos)
	"Manav Visit": [
		"public/js/manav_lead_quotation.js",
		"public/js/manav_dvr_stage.js",
	],
	"Manav Lead": ["public/js/manav_lead_quotation.js", "public/js/manav_lead_form.js"],
}

# CHANGE NOTE
# Date: 2026-10-17
# Change: Quotation list: the principal is shown as a coloured label (public/js/quotation_list.js).
# Reason: The user asked for colour on the quotation type in the list view.
# CHANGE NOTE
# Date: 2026-10-19
# Change: Item list: "Sub-Items Tree" button (public/js/item_list.js) opening the page
# machine-sub-items.
# Reason: The user asked for a tree of the machines' sub-items in the Items list.
# CHANGE NOTE
# Date: 2026-10-28
# Change: Sales Order list: "Draft PI" / "Final PI: <status>" labels (public/js/sales_order_list.js).
# Reason: The user asked to see in the list whether a Sales Order is a Draft PI or a Final PI.
# 2026-10-29: every Sales Order is a Final PI now ("Final PI: Not Submitted" / "Final PI: <status>");
# the Draft PI is the Manav doctype Draft PI (its scripts are in its doctype folder).
doctype_list_js = {
	"Quotation": "public/js/quotation_list.js",
	"Item": "public/js/item_list.js",
	"Sales Order": "public/js/sales_order_list.js",
}

# The Manav quotation number (e.g. 26QP000639) for a Quotation that has a principal.
# CHANGE NOTE
# Date: 2026-10-15
# Change: validate numbers the sub-items of each machine (Sub-Item Sr.No).
# Reason: The user asked for a column numbering the sub-items in the Items table.
# CHANGE NOTE
# Date: 2026-10-19
# Change: validate also fills the Account Manager from the Customer (fill_account_manager).
# Reason: The user asked for the Customer's Account Manager to be filled in on the quotation.
doc_events = {
	"Quotation": {
		"autoname": "manav.manav.quotation.autoname",
		"validate": [
			# 2026-10-19: sub-item lines keep their machine's price (ERPNext re-prices from the price list)
			"manav.manav.quotation.keep_sub_item_rates",
			"manav.manav.quotation.number_sub_items",
			"manav.manav.quotation.fill_account_manager",
			# 2026-10-19: warn when the currency is not the principal's (e.g. MACHINES in INR)
			"manav.manav.quotation.warn_principal_currency",
			# 2026-10-29: CIF ticked -> empty CIF Port / Charges from the principal's defaults
			# 2026-11-04: CIF = CIF Charges has an amount; the tick is hidden and set from it
			"manav.manav.quotation.fill_cif_defaults",
		],
		# 2026-11-02: a quotation made from a lead (Make Quotation, RFQ stage) becomes the lead's Quotation
		"on_update": "manav.manav.lead_board.link_quotation_to_lead",
	},
	# 2026-10-28: the PI (Sales Order) keeps the sub-items' machine prices and numbers like a quotation
	# CHANGE NOTE
	# Date: 2026-10-29
	# Change: The Sales Order is the Final PI only (the Draft PI is the Manav doctype "Draft PI"):
	# numbered 26FPI00001 (autoname); quotation, Draft PI and Final PI refer to each other
	# (link_pi_documents, unlink_pi_documents, also on cancel).
	# Reason: The user asked for a Draft PI step, as a separate document, before the Final PI (the
	# Sales Order), each of Quotation, Draft PI and Final PI with its own number and the others' as
	# reference.
	"Sales Order": {
		"autoname": "manav.manav.pi.autoname",
		# 2026-10-28: Delivery Date is hidden on the PI; ERPNext still needs one (pi.py)
		"before_validate": "manav.manav.pi.fill_delivery_date",
		"validate": [
			"manav.manav.quotation.keep_sub_item_rates",
			"manav.manav.quotation.number_sub_items",
			# 2026-10-28: Quotation No. on the PI, PI No. on the quotation (pi.py)
			"manav.manav.pi.set_quotation_reference",
			# 2026-10-31: Price Basis printed under each machine (pi.py)
			"manav.manav.pi.fill_price_basis",
			# 2026-11-04: CIF when CIF Charges has an amount (the tick is hidden)
			"manav.manav.quotation.fill_cif_defaults",
		],
		# 2026-11-04: the CIF fields can be changed after submit (allow_on_submit); keep the tick in step
		"before_update_after_submit": "manav.manav.quotation.fill_cif_defaults",
		"on_update": "manav.manav.pi.link_pi_documents",
		# 2026-10-31: a Final PI from a Draft PI may order more than the quotation's quantity (pi.py)
		"before_submit": "manav.manav.pi.allow_draft_pi_quantities",
		"on_submit": "manav.manav.pi.link_pi_documents",
		"on_cancel": "manav.manav.pi.unlink_pi_documents",
		"on_trash": "manav.manav.pi.unlink_pi_documents",
	},
	# CHANGE NOTE
	# Date: 2026-11-02
	# Change: A DVR (Manav Visit) takes the lead's stage when none is chosen, gets its Next Visit Date from
	# the stage's days, and the latest DVR moves the lead's stage, status and next follow-up (lead_board.py).
	# Reason: The user asked for a Leads Board with each lead's stage, status, date and DVR count, and a
	# Make DVR button on the card.
	# 2026-11-04: visits are submittable; a visit moves the lead when it is submitted (was on every save)
	"Manav Visit": {
		"before_insert": "manav.manav.lead_board.fill_dvr_stage",
		"on_submit": "manav.manav.lead_board.move_lead_stage",
	},
}

# Uninstallation
# ------------

# before_uninstall = "manav.uninstall.before_uninstall"
# after_uninstall = "manav.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "manav.utils.before_app_install"
# after_app_install = "manav.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "manav.utils.before_app_uninstall"
# after_app_uninstall = "manav.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "manav.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "manav.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["manav.search.awesomebar_results"]

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# 2026-11-05: each login sees only its own leads (created by it, or it is the Sale Engineer);
# Administrator / System Manager see all. Rule in manav/manav/lead_permission.py.
permission_query_conditions = {
	"Manav Lead": "manav.manav.lead_permission.get_permission_query_conditions",
}

has_permission = {
	"Manav Lead": "manav.manav.lead_permission.has_permission",
}

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# CHANGE NOTE
# Date: 2026-10-30
# Change: Daily follow-up reminder: a visit whose Next Visit Date is tomorrow notifies the sale
# engineer today (manav_visit.send_followup_reminders).
# Reason: The user asked that the follow-up notification goes out the day before the next visit.
scheduler_events = {
	"daily": [
		"manav.manav.doctype.manav_visit.manav_visit.send_followup_reminders",
	],
}

# scheduler_events = {
# 	"all": [
# 		"manav.tasks.all"
# 	],
# 	"daily": [
# 		"manav.tasks.daily"
# 	],
# 	"hourly": [
# 		"manav.tasks.hourly"
# 	],
# 	"weekly": [
# 		"manav.tasks.weekly"
# 	],
# 	"monthly": [
# 		"manav.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "manav.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "manav.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "manav.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "manav.task.get_dashboard_data"
# }

# CHANGE NOTE
# Date: 2026-11-03
# Change: The Quotation's Connections list its Draft PIs and Final PIs (quotation.get_quotation_dashboard).
# Reason: The user asked for Draft PI and Final PI in the quotation's connections.
override_doctype_dashboards = {"Quotation": "manav.manav.quotation.get_quotation_dashboard"}

# CHANGE NOTE
# Date: 2026-11-07
# Change: Every Stage dropdown (lead, visit) lists the stages by Sequence (lead_board.stage_query).
# Reason: The user found the stage order wrong (Frappe sorted the most-used stages first).
standard_queries = {"Manav Lead Stage": "manav.manav.lead_board.stage_query"}

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["manav.utils.before_request"]
# after_request = ["manav.utils.after_request"]

# Job Events
# ----------
# before_job = ["manav.utils.before_job"]
# after_job = ["manav.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"manav.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

