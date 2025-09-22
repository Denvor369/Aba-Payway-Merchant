PAYWAY GUARD (MINIMAL, STRICT)
------------------------------
Enables the "Purchase with ABA" button ONLY when:
  • #name is filled
  • #phone is filled
  • #address OR #province-input is filled
Notes:
  • Never checks #note (additional box).
  • Button id checked: #paywayBtn (preferred), then #purchaseBtn.
  • If any required element doesn't exist, it exits quietly (does nothing).

INSTALL (no file overwrites):
  1) Copy 'payway-guard-min.js' into the SAME folder as your 'checkout.html'.
  2) In 'checkout.html', add this ONE line AFTER your existing scripts, just before </body>:
       <script src="payway-guard-min.js"></script>
  3) Make sure your button starts disabled in HTML (optional but recommended):
       <button id="paywayBtn" class="btn-purchase" disabled>Purchase with ABA</button>

UNDO:
  • Remove the <script> tag line and (optionally) remove 'disabled' from the button.
