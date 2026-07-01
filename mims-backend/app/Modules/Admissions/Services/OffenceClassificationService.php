<?php

namespace App\Modules\Admissions\Services;

class OffenceClassificationService
{
    /**
     * Map offences to security classifications based on severity.
     *
     * @return array<string, string>
     */
    private function getOffenceSecurityMapping(): array
    {
        return [
            // Maximum security offences
            'Murder' => 'maximum',
            'Attempted Murder' => 'maximum',
            'Treason' => 'maximum',
            'Sedition' => 'maximum',
            'Espionage' => 'maximum',
            'Rape' => 'maximum',
            'Attempted Rape' => 'maximum',
            'Defilement (under 13)' => 'maximum',
            'Trafficking for Sexual Exploitation' => 'maximum',
            'Human Trafficking' => 'maximum',
            'Armed Robbery' => 'maximum',
            'Possession of Firearm Without Licence' => 'maximum',
            'Illegal Possession of Ammunition' => 'maximum',

            // High security offences
            'Manslaughter' => 'high',
            'Grievous Bodily Harm (GBH)' => 'high',
            'Wounding with Intent' => 'high',
            'Kidnapping' => 'high',
            'Unlawful Detention / False Imprisonment' => 'high',
            'Domestic Violence' => 'high',
            'Defilement (under 16)' => 'high',
            'Indecent Assault' => 'high',
            'Robbery' => 'high',
            'Arson' => 'high',
            'Trafficking in Controlled Substances' => 'high',
            'Cultivating Cannabis' => 'high',
            'Incitement to Violence' => 'high',
            'Dangerous Driving Causing Death' => 'high',
            'Hit-and-Run' => 'high',
            'Child Abduction' => 'high',
            'Neglect / Cruelty to Children' => 'high',

            // Medium security offences
            'Common Assault' => 'medium',
            'Assault Occasioning Actual Bodily Harm (ABH)' => 'medium',
            'Unlawful Wounding' => 'medium',
            'Sexual Harassment' => 'medium',
            'Burglary' => 'medium',
            'Housebreaking' => 'medium',
            'Motor Vehicle Theft' => 'medium',
            'Receiving Stolen Property' => 'medium',
            'Fraud' => 'medium',
            'Forgery' => 'medium',
            'Obtaining by False Pretences' => 'medium',
            'Embezzlement' => 'medium',
            'Breach of Trust' => 'medium',
            'Possession of Controlled Substances' => 'medium',
            'Affray' => 'medium',
            'Rioting' => 'medium',
            'Breach of Peace' => 'medium',
            'Trespass' => 'medium',
            'Dangerous Driving' => 'medium',
            'Driving Under the Influence (DUI)' => 'medium',
            'Driving Without a Licence' => 'medium',
            'Possession of Offensive Weapon' => 'medium',
            'Bribery' => 'medium',
            'Corruption' => 'medium',
            'Money Laundering' => 'medium',
            'Contempt of Court' => 'medium',
            'Poaching / Wildlife Trafficking' => 'medium',

            // Low security offences
            'Theft' => 'low',
        ];
    }

    /**
     * Classify an offence based on its description.
     *
     * @param  string|null  $offenceDescription
     * @param  string  $defaultClassification
     * @return string
     */
    public function classifyOffence(?string $offenceDescription, string $defaultClassification = 'medium'): string
    {
        if (empty($offenceDescription)) {
            return $defaultClassification;
        }

        $mapping = $this->getOffenceSecurityMapping();

        // Direct match
        if (isset($mapping[$offenceDescription])) {
            return $mapping[$offenceDescription];
        }

        // Case-insensitive match
        $lowercaseDescription = strtolower($offenceDescription);
        foreach ($mapping as $offence => $classification) {
            if (strtolower($offence) === $lowercaseDescription) {
                return $classification;
            }
        }

        // Partial match for custom offences
        $classification = $this->classifyByKeywords($offenceDescription);
        if ($classification !== null) {
            return $classification;
        }

        return $defaultClassification;
    }

    /**
     * Classify custom offences based on keywords.
     *
     * @param  string  $offenceDescription
     * @return string|null
     */
    private function classifyByKeywords(string $offenceDescription): ?string
    {
        $lowercase = strtolower($offenceDescription);

        // Maximum security keywords
        $maximumKeywords = [
            'murder', 'kill', 'homicide', 'treason', 'sedition', 'espionage', 'spy',
            'rape', 'sexual assault', 'defilement', 'trafficking', 'armed', 'firearm',
            'weapon', 'ammunition', 'massacre', 'terrorism', 'terrorist'
        ];

        // High security keywords
        $highKeywords = [
            'manslaughter', 'grievous', 'gbh', 'wounding', 'kidnap', 'abduction',
            'detention', 'domestic violence', 'robbery', 'arson', 'fire', 'burn',
            'dangerous driving', 'death', 'fatal', 'hit and run', 'drug trafficking',
            'cultivat', 'incitement', 'violence', 'child abuse', 'cruelty'
        ];

        // Medium security keywords
        $mediumKeywords = [
            'assault', 'battery', 'wound', 'harassment', 'burglary', 'housebreak',
            'vehicle theft', 'car theft', 'fraud', 'forgery', 'false pretence', 'embezzle',
            'breach of trust', 'drug possession', 'controlled substance', 'cannabis',
            'affray', 'riot', 'breach of peace', 'trespass', 'dui', 'drunk driving',
            'weapon', 'bribery', 'corrupt', 'money laundering', 'contempt', 'court',
            'poaching', 'wildlife', 'theft', 'steal', 'stolen'
        ];

        // Check maximum security keywords
        foreach ($maximumKeywords as $keyword) {
            if (str_contains($lowercase, $keyword)) {
                return 'maximum';
            }
        }

        // Check high security keywords
        foreach ($highKeywords as $keyword) {
            if (str_contains($lowercase, $keyword)) {
                return 'high';
            }
        }

        // Check medium security keywords
        foreach ($mediumKeywords as $keyword) {
            if (str_contains($lowercase, $keyword)) {
                return 'medium';
            }
        }

        return null;
    }

    /**
     * Get the security classification for a convict based on offence description.
     *
     * @param  string|null  $offenceDescription
     * @return string
     */
    public function getClassificationForConvict(?string $offenceDescription): string
    {
        return $this->classifyOffence($offenceDescription, 'medium');
    }
}