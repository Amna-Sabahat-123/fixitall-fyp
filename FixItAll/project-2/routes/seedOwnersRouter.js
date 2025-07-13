const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const bcrypt = require("bcrypt");

const owners = [
    {
        fullName: "Owner One",
        email: "amnasabahat6@gmail.com",
        phone: "SDFG",
        password: "password123"
    },
    {
        fullName: "Owner Two",
        email: "owner2@example.com",
        phone: "2222222222",
        password: "password123"
    },
    {
        fullName: "Owner Three",
        email: "owner3@example.com",
        phone: "3333333333",
        password: "password123"
    }
];

// Allow seeding only in development mode
if (process.env.NODE_ENV === "development") {
    router.get("/seed-owners", async (req, res) => {
        try {
            for (let owner of owners) {
                const existing = await ownerModel.findOne({ email: owner.email });

                const hashedPassword = await bcrypt.hash(owner.password, 10);

                if (existing) {
                    // Optionally update details
                    existing.fullName = owner.fullName;
                    existing.phone = owner.phone;
                    existing.password = hashedPassword;
                    await existing.save();
                    console.log(`Updated owner: ${owner.email}`);
                } else {
                    await ownerModel.create({
                        ...owner,
                        password: hashedPassword
                    });
                    console.log(`Created owner: ${owner.email}`);
                }
            }
            res.send("Owners seeded or updated successfully");
        } catch (err) {
            console.error(err);
            res.status(500).send("Error seeding owners");
        }
    });
} else {
    router.get("/seed-owners", (req, res) => {
        res.status(403).send("Seeding not allowed in production");
    });
}

module.exports = router;
