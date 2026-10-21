# Copyright (c) 2026, milind and contributors
# For license information, please see license.txt

"""Manav AI Settings: the OpenAI key, model and reasoning effort used by Draft with AI
(manav/manav/quotation_agent.py).

Why: on Frappe Cloud the site_config.json of a site cannot always be edited (the Site Config
screen depends on the plan and on the account), so the key can be entered here in the site
itself instead. The key is a Password field, so Frappe stores it encrypted. The agent reads
these settings first and falls back to site_config (openai_api_key, openai_model,
openai_reasoning_effort), which is how manav.local was set up.

Only System Managers can open this page. No custom logic is needed, so the class is empty.

Created: 2026-10-21.
"""

# import frappe
from frappe.model.document import Document


class ManavAISettings(Document):
	pass
