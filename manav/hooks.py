app_name = "manav"
app_title = "Manav"
app_publisher = "milind"
app_description = "Manav quotation "
app_email = "support02@softworld.co.in"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

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
# web_include_js = "/assets/manav/js/manav.js"

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
]

# Manav's screen logic on ERPNext's Quotation form: principal defaults, item filter, Add Options.
# Item: the "Format Pasted Specifications" button (added 2026-10-12, so that a specification table
# copied from the manufacturer's site can be turned into the lines the quotation prints).
doctype_js = {"Quotation": "public/js/quotation.js", "Item": "public/js/item.js"}

# The Manav quotation number (e.g. 26QP000639) for a Quotation that has a principal.
doc_events = {"Quotation": {"autoname": "manav.manav.quotation.autoname"}}

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

