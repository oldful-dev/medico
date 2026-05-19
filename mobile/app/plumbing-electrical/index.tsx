import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png');

export default function PlumbingElectricalScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [landmark, setLandmark] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('plumbing-electrical');

    const handleBook = async () => {
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert('Address Required', 'Could not fetch your address. Please wait or try again.');
            return;
        }
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'plumbing-electrical')
                : [];
            router.push({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        serviceId, cityId,
                        scheduledDate: new Date().toISOString(),
                        addressLine: address,
                        landmark: landmark || undefined,
                        formDataJson: { attachments: uploadedImageUrls },
                    }),
                    amount: String(servicePrice),
                    label: serviceName || 'Plumbing & Electrical',
                },
            });
        } catch {
            Alert.alert('Error', 'Failed to upload. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <ServiceDetailScreen
            headerTitle="Plumbing & Electrical"
            heroTitle="Plumbing & Electrical"
            heroSubtitle="Concierge Services"
            description="Book a certified plumber or electrician for pipe leaks, wiring faults, and all home repairs."
            heroImage={imgHero}
            pricingLabel={servicePrice > 0 ? `₹${servicePrice} Booking Fee + Vendor's Bill` : 'Fetching price...'}
            pricingNote="*The vendor's bill depends on the actual work needed."
            bulletItems={[
                'Pipe Leakage & Repair',
                'Drainage Cleaning & Unclogging',
                'Electrical Wiring & Switchboard',
                'Fan & Light Fixture Installation',
            ]}
            address={address}
            landmark={landmark}
            onLandmarkChange={setLandmark}
            onBook={handleBook}
            isLoading={isLoading || isBooking}
        >
            <ImageUploadBox
                title="Select An Image Of The Issue"
                subtitle="JPG, PNG or PDF, file size no more than 10MB"
                onImagesChange={setSelectedImages}
                maxImages={3}
            />
        </ServiceDetailScreen>
    );
}
