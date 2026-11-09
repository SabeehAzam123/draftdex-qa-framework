import { expect, test } from "@/support/fixtures";
import { flow } from "@/support/flow";

const wallet = flow.define({
    id: "wallet.ui-history",
    title: "The wallet shows the balance and every credit movement",
    module: "wallet",
    kind: "ui",
    requires: ["entry.pending"],
});
test(...flow.case(wallet, async ({ given, ui }) => {
    await ui.signInAs(given("entry.pending").coach);
    await ui.wallet.open();
    await expect(ui.wallet.balance()).toHaveText("900 cr");
    await expect(ui.wallet.rows()).toHaveCount(2);
    await expect(ui.wallet.rows("entry_fee").getByTestId("wallet-row-amount")).toHaveText("-100");
    await expect(ui.wallet.rows("signup_bonus").getByTestId("wallet-row-amount")).toHaveText("+1,000");
}));
