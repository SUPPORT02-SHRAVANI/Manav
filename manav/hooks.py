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
add_to_apps_screen = [
	{
		"name": "manav",
		"logo": "/assets/manav/images/manav_logo.svg",
		"title": "Manav",
		# 2026-10-22: the Manav workspace after login (2026-10-19 to 10-21: /manav-dashboard)
		"route": "/desk/manav",
		"has_permission": "manav.manav.desk_home.has_app_permission",
	}
]

# CHANGE NOTE
# Date: 2026-10-22
# Change: Users other than the Administrator and System Managers see only the Manav workspace,
# sidebar and app in the desk (manav.manav.desk_home.limit_desk_to_manav).
# Reason: The user asked that everyone except the admin sees only the Manav workspace.
extend_bootinfo = ["manav.manav.desk_home.limit_desk_to_manav"]

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

# include js, css files in header of web template
# web_include_css = "/assets/manav/css/manav.css"
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
	# 2026-10-19: Manav as the Default App, so users land on the Manav workspace after login.
	"manav.manav.desk_home.set_default_app",
	# 2026-10-19: the role that sees all employees' figures (dashboard tabs, workspace team charts)
	"manav.manav.desk_home.setup_management_role",
	# 2026-10-19: the tab bar of the Manav workspace (Custom HTML Block, see workspace_tabs.py)
	"manav.manav.workspace_tabs.setup_workspace_tabs",
	# 2026-10-19: Job Offer fields for the print format Manav Appointment Letter (HRMS only)
	"manav.manav.job_offer_fields.setup_job_offer_fields",
	# 2026-10-22: support@ e-mail account, the managers' logins and the staff's access requests
	# (after setup_management_role, whose role the managers get)
	"manav.manav.signup.setup_signup",
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
doctype_js = {
	"Quotation": "public/js/quotation.js",
	"Item": "public/js/item.js",
	"Job Offer": "public/js/job_offer.js",
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
doctype_list_js = {"Quotation": "public/js/quotation_list.js", "Item": "public/js/item_list.js"}

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
		],
	}
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

