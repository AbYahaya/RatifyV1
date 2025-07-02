import { deserializeAddress } from "@meshsdk/core";

const paymentAddress = "addr_test1qppy36f5830l4l9su6c4ka7fz59vxjv8yg4hfqhcyxk6xsgawqjfz5j48j3ugqf6ezzhzmmz2ku2xn6kaufe2fwx3s2s63nk9p"; // Replace with your Eternl payment address

async function extractAdminVK() {
  try {
    const { pubKeyHash } = deserializeAddress(paymentAddress);
    console.log("adminVK (pubKeyHash):", pubKeyHash);
  } catch (error) {
    console.error("Failed to extract adminVK:", error);
  }
}

extractAdminVK();
