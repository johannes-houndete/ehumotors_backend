from django.test import TestCase
from .views import compute_price, _calculer_cout

class PricingTest(TestCase):
    def test_compute_price_clamping(self):
        # Negative start/target clamped to 0
        self.assertEqual(compute_price(-10.0, 5.0), compute_price(0.0, 5.0))
        # Start/target > 100 clamped to 100
        self.assertEqual(compute_price(90.0, 110.0), compute_price(90.0, 100.0))

    def test_compute_price_zero_or_negative_delta(self):
        self.assertEqual(compute_price(50.0, 50.0), 0.0)
        self.assertEqual(compute_price(50.0, 40.0), 0.0)

    def test_compute_price_with_penalty(self):
        # start < 5 should have a 250 FCFA penalty
        # from 2 to 15: penalty 250 + (5 to 10 @ 20 => 100) + (10 to 15 @ 15 => 75) = 425
        self.assertEqual(compute_price(2.0, 15.0), 425.0)

        # start >= 5 should NOT have a 250 FCFA penalty
        # from 8 to 95: (8 to 10 @ 20 => 40) + (10 to 20 @ 15 => 150) + (20 to 90 @ 12 => 840) + (90 to 95 @ 15 => 75) = 1105
        self.assertEqual(compute_price(8.0, 95.0), 1105.0)

    def test_compute_price_full_charge(self):
        # from 0 to 100: penalty 250 + (5-10 @ 20 => 100) + (10-20 @ 15 => 150) + (20-90 @ 12 => 840) + (90-100 @ 15 => 150) = 1490
        self.assertEqual(compute_price(0.0, 100.0), 1490.0)

    def test_calculer_cout(self):
        # Test energy calculation along with cost calculation
        # energy: (15.0 - 2.0) / 100 * 4416 = 574.08 Wh
        # cost: compute_price(2.0, 15.0) = 425.0
        energy, cost = _calculer_cout(pct_depart=2.0, pct_cible=15.0, capacite_wh=4416.0, prix_par_wh=0.0)
        self.assertEqual(energy, 574.08)
        self.assertEqual(cost, 425.0)

