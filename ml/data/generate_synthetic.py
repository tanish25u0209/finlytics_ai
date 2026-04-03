"""
Synthetic dataset generator for training and testing.

Generates realistic business financial data with binary default labels for ML model training,
and test scenarios for scoring engine validation.
"""
import csv
import json
import random
from pathlib import Path
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class ApplicantRecord:
    """Single applicant financial record."""
    monthly_revenue: float
    net_profit: float
    debt: float
    emi: float
    gst_compliance: int
    past_disputes: int
    business_age: int
    collateral_type: int
    default_label: int = None  # 0 = repaid, 1 = defaulted (for training only)


class SyntheticDataGenerator:
    """Generates realistic synthetic applicant data."""
    
    def __init__(self, seed: int = 42):
        """Initialize with random seed for reproducibility."""
        random.seed(seed)
    
    def _generate_revenue_distribution(self, tier: str) -> float:
        """
        Generate monthly revenue based on business tier.
        
        Tiers:
        - 'micro': 50k-200k (micro enterprises)
        - 'small': 200k-1M (small businesses)
        - 'medium': 1M-5M (medium enterprises)
        - 'large': 5M+ (large businesses)
        """
        tier_ranges = {
            'micro': (50000, 200000),
            'small': (200000, 1000000),
            'medium': (1000000, 5000000),
            'large': (5000000, 20000000),
        }
        
        min_rev, max_rev = tier_ranges.get(tier, tier_ranges['small'])
        return round(random.uniform(min_rev, max_rev) / 10000) * 10000  # Round to 10k
    
    def _generate_profit_from_revenue(self, revenue: float, margin_pct: float = None) -> float:
        """Generate net profit based on revenue with realistic margin."""
        if margin_pct is None:
            # Random profit margin between 5% and 30%
            margin_pct = random.uniform(0.05, 0.30)
        
        profit = revenue * margin_pct
        # Add some noise
        noise = profit * random.uniform(-0.1, 0.1)
        return max(0, round(profit + noise))
    
    def _generate_debt_and_emi(self, revenue: float, risk_profile: str) -> Tuple[float, float]:
        """
        Generate realistic debt and EMI.
        
        Risk profiles affect debt-to-revenue ratio:
        - 'low': 0.2-0.5 (conservative)
        - 'medium': 0.5-1.0 (balanced)
        - 'high': 1.0-2.0 (leveraged)
        """
        ratios = {
            'low': (0.2, 0.5),
            'medium': (0.5, 1.0),
            'high': (1.0, 2.0),
        }
        
        min_ratio, max_ratio = ratios.get(risk_profile, ratios['medium'])
        debt_to_revenue = random.uniform(min_ratio, max_ratio)
        total_debt = revenue * debt_to_revenue
        
        # EMI typically 10-30% of debt per year (assume 3-year loan)
        annual_emi_pct = random.uniform(0.10, 0.30)
        monthly_emi = (total_debt * annual_emi_pct) / 12
        
        return round(total_debt), round(monthly_emi)
    
    def _generate_cumulative_default_risk(
        self,
        revenue: float,
        debt: float,
        emi: float,
        business_age: int,
        gst_compliance: int,
        past_disputes: int
    ) -> Tuple[int, float]:
        """
        Estimate probability of default from financials to label synthetic data.
        
        Returns:
            Tuple of (default_label, pd_probability)
            - label: 0 (repaid) or 1 (defaulted)
            - pd: probability of default (0-1)
        """
        # Calculate risk factors
        risk_score = 0.0
        
        # 1. Debt-to-revenue ratio (higher is riskier)
        if revenue > 0:
            debt_ratio = debt / revenue
            if debt_ratio > 2.0:
                risk_score += 0.4
            elif debt_ratio > 1.0:
                risk_score += 0.2
            elif debt_ratio > 0.5:
                risk_score += 0.05
        else:
            risk_score += 0.5
        
        # 2. Debt service coverage ratio (lower is riskier)
        if emi > 0:
            dscr = revenue / (emi * 12 + 1)  # Add 1 to avoid division by zero
            if dscr < 1.0:
                risk_score += 0.3
            elif dscr < 1.5:
                risk_score += 0.15
        else:
            # No EMI = no debt service risk
            pass
        
        # 3. Business age (newer is riskier)
        if business_age < 12:
            risk_score += 0.2
        elif business_age < 24:
            risk_score += 0.1
        
        # 4. GST compliance (non-compliance increases risk)
        if gst_compliance == 0:
            risk_score += 0.15
        
        # 5. Past disputes (strong indicator of default risk)
        if past_disputes == 1:
            risk_score += 0.25
        
        # Clamp risk score to [0, 1]
        pd_probability = min(max(risk_score, 0.0), 1.0)
        
        # Convert PD to binary label (probabilistic assignment)
        default_label = 1 if random.random() < pd_probability else 0
        
        return default_label, pd_probability
    
    def generate_single_record(self, business_tier: str = None) -> ApplicantRecord:
        """Generate a single applicant record."""
        if business_tier is None:
            business_tier = random.choice(['micro', 'small', 'medium', 'large'])
        
        risk_profile = random.choice(['low', 'medium', 'high'])
        
        # Generate core financial metrics
        revenue = self._generate_revenue_distribution(business_tier)
        profit = self._generate_profit_from_revenue(revenue)
        debt, emi = self._generate_debt_and_emi(revenue, risk_profile)
        
        # Generate compliance/behavior flags
        gst_compliance = random.choices([0, 1], weights=[0.2, 0.8])[0]  # 80% compliant
        past_disputes = random.choices([0, 1], weights=[0.85, 0.15])[0]  # 15% have disputes
        
        # Generate business age (0-180 months = 15 years)
        business_age = random.randint(1, 180)
        
        # Generate collateral type
        collateral_type = random.randint(0, 2)
        
        # Estimate default label
        default_label, _ = self._generate_cumulative_default_risk(
            revenue, debt, emi, business_age, gst_compliance, past_disputes
        )
        
        return ApplicantRecord(
            monthly_revenue=revenue,
            net_profit=profit,
            debt=debt,
            emi=emi,
            gst_compliance=gst_compliance,
            past_disputes=past_disputes,
            business_age=business_age,
            collateral_type=collateral_type,
            default_label=default_label
        )
    
    def generate_dataset(self, num_samples: int = 200, include_tiers: bool = True) -> List[ApplicantRecord]:
        """
        Generate a diverse dataset of applicant records.
        
        Args:
            num_samples: Number of records to generate
            include_tiers: If True, distribute evenly across business tiers
            
        Returns:
            List of ApplicantRecord instances
        """
        dataset = []
        tiers = ['micro', 'small', 'medium', 'large'] if include_tiers else [None]
        
        samples_per_tier = num_samples // len(tiers)
        remainder = num_samples % len(tiers)
        
        for i, tier in enumerate(tiers):
            count = samples_per_tier + (1 if i < remainder else 0)
            for _ in range(count):
                dataset.append(self.generate_single_record(tier))
        
        return dataset
    
    def save_to_csv(self, datasets: List[ApplicantRecord], filepath: Path, include_label: bool = True):
        """
        Save dataset to CSV file.
        
        Args:
            datasets: List of ApplicantRecord instances
            filepath: Path to save CSV
            include_label: If True, include default_label column (for training)
        """
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        fieldnames = [
            'monthly_revenue', 'net_profit', 'debt', 'emi',
            'gst_compliance', 'past_disputes', 'business_age', 'collateral_type'
        ]
        if include_label:
            fieldnames.append('default_label')
        
        with open(filepath, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for record in datasets:
                row = {
                    'monthly_revenue': record.monthly_revenue,
                    'net_profit': record.net_profit,
                    'debt': record.debt,
                    'emi': record.emi,
                    'gst_compliance': record.gst_compliance,
                    'past_disputes': record.past_disputes,
                    'business_age': record.business_age,
                    'collateral_type': record.collateral_type,
                }
                if include_label:
                    row['default_label'] = record.default_label
                
                writer.writerow(row)
    
    def save_to_json(self, datasets: List[ApplicantRecord], filepath: Path, include_label: bool = True):
        """Save dataset to JSON file."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        data = []
        for record in datasets:
            item = {
                'monthly_revenue': record.monthly_revenue,
                'net_profit': record.net_profit,
                'debt': record.debt,
                'emi': record.emi,
                'gst_compliance': record.gst_compliance,
                'past_disputes': record.past_disputes,
                'business_age': record.business_age,
                'collateral_type': record.collateral_type,
            }
            if include_label:
                item['default_label'] = record.default_label
            
            data.append(item)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)


if __name__ == "__main__":
    # Generate training and test datasets
    generator = SyntheticDataGenerator(seed=42)
    
    # Generate training dataset (300 samples with labels)
    print("Generating training dataset (300 samples)...")
    train_data = generator.generate_dataset(num_samples=300, include_tiers=True)
    train_path = Path(__file__).parent / "training_data.csv"
    generator.save_to_csv(train_data, train_path, include_label=True)
    print(f"✓ Training dataset saved to {train_path}")
    
    # Generate test dataset (50 samples without labels for API testing)
    print("Generating test dataset (50 samples)...")
    test_data = generator.generate_dataset(num_samples=50, include_tiers=True)
    test_path = Path(__file__).parent / "test_data.csv"
    generator.save_to_csv(test_data, test_path, include_label=False)
    print(f"✓ Test dataset saved to {test_path}")
    
    # Also save as JSON for flexibility
    print("Saving datasets as JSON...")
    generator.save_to_json(train_data, Path(__file__).parent / "training_data.json", include_label=True)
    generator.save_to_json(test_data, Path(__file__).parent / "test_data.json", include_label=False)
    print("✓ JSON datasets saved")
    
    # Print summary statistics
    print("\nTraining Dataset Summary (300 samples):")
    default_count = sum(1 for r in train_data if r.default_label == 1)
    print(f"  - Total records: {len(train_data)}")
    print(f"  - Defaults: {default_count} ({100*default_count/len(train_data):.1f}%)")
    print(f"  - Non-defaults: {len(train_data) - default_count}")
    print(f"\nTest Dataset Summary (50 samples):")
    print(f"  - Total records: {len(test_data)}")
