import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png');

export default function DeepCleaningScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [landmark, setLandmark] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('deep-cleaning');

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
                ? await mediaService.uploadMultipleMedia(selectedImages, 'deep-cleaning')
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
                    label: serviceName || 'Deep Cleaning',
                },
            });
        } catch {
            Alert.alert('Error', 'Something went wrong. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <ServiceDetailScreen
            headerTitle="Deep Cleaning / Pest"
            heroTitle="Deep Cleaning / Pest"
            heroSubtitle="Concierge Services"
            description="Book professional deep cleaning or pest control for your home — thorough, safe, and certified."
            heroImage={imgHero}
            pricingLabel={servicePrice > 0 ? `₹${servicePrice} Onwards (based on area)` : 'Fetching price...'}
            pricingNote="*Pricing depends on the number of rooms and type of cleaning."
            bulletItems={[
                'Full Home Deep Cleaning',
                'Kitchen & Bathroom Sanitization',
                'Pest Control Treatment',
                'Sofa / Carpet / Mattress Cleaning',
            ]}
            address={address}
            landmark={landmark}
            onLandmarkChange={setLandmark}
            onBook={handleBook}
            isLoading={isLoading || isBooking}
        >
            <ImageUploadBox
                title="Select An Image Of The Area"
                subtitle="JPG, PNG or PDF, file size no more than 10MB"
                onImagesChange={setSelectedImages}
                maxImages={3}
            />
        </ServiceDetailScreen>
    );
}
