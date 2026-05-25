const { Lead } = require("../models");

const DUMMY_LEADS = [
  { name: "Vikram Singh",       phone: "9811023456", email: "vikram.s@gmail.com",  city: "Delhi",     product: "Home Loan",      source: "Website",      amount: 2500000 },
  { name: "Anjali Sharma",      phone: "9920134567", email: "anjali@yahoo.com",    city: "Mumbai",    product: "Personal Loan",  source: "Facebook Ads", amount: 300000  },
  { name: "Rohit Verma",        phone: "9845245678", email: "rohit.v@gmail.com",   city: "Bangalore", product: "Credit Card",    source: "Referral",     amount: null    },
  { name: "Priya Nair",         phone: "9876356789", email: "priya.n@outlook.com", city: "Pune",      product: "Home Loan",      source: "Google Ads",   amount: 4200000 },
  { name: "Amit Patel",         phone: "9988467890", email: "amit.p@gmail.com",    city: "Ahmedabad", product: "Business Loan",  source: "Walk-in",      amount: 1500000 },
  { name: "Sneha Kulkarni",     phone: "9012578901", email: "sneha.k@gmail.com",   city: "Mumbai",    product: "Personal Loan",  source: "Website",      amount: 500000  },
  { name: "Rajesh Kumar",       phone: "9123689012", email: "rajesh.k@yahoo.com",  city: "Jaipur",    product: "Car Loan",       source: "Justdial",     amount: 800000  },
  { name: "Neha Gupta",         phone: "9234790123", email: "neha.g@gmail.com",    city: "Delhi",     product: "Credit Card",    source: "Instagram",    amount: null    },
  { name: "Suresh Reddy",       phone: "9345801234", email: "suresh.r@gmail.com",  city: "Hyderabad", product: "Home Loan",      source: "Referral",     amount: 3500000 },
  { name: "Pooja Mehta",        phone: "9456912345", email: "pooja.m@yahoo.com",   city: "Surat",     product: "Personal Loan",  source: "Website",      amount: 200000  },
  { name: "Karan Joshi",        phone: "9567023456", email: "karan.j@gmail.com",   city: "Bangalore", product: "Business Loan",  source: "Facebook Ads", amount: 2200000 },
  { name: "Deepika Iyer",       phone: "9678134567", email: "deepika.i@gmail.com", city: "Chennai",   product: "Home Loan",      source: "Google Ads",   amount: 5500000 },
  { name: "Arun Choudhary",     phone: "9789245678", email: "arun.c@outlook.com",  city: "Kolkata",   product: "Personal Loan",  source: "Walk-in",      amount: 400000  },
  { name: "Meera Rao",          phone: "9890356789", email: "meera.r@gmail.com",   city: "Pune",      product: "Car Loan",       source: "Justdial",     amount: 700000  },
  { name: "Sanjay Bhatia",      phone: "9901467890", email: "sanjay.b@gmail.com",  city: "Delhi",     product: "Business Loan",  source: "Referral",     amount: 1800000 },
];

async function seedDummyLeads() {
  const count = await Lead.count();
  if (count > 0) {
    console.log(`[SEED] dummy_leads already has ${count} rows — skipping`);
    return;
  }

  await Lead.bulkCreate(DUMMY_LEADS);
  console.log(`[SEED] Inserted ${DUMMY_LEADS.length} dummy leads into pool`);
}

module.exports = seedDummyLeads;
