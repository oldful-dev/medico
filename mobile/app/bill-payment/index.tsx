import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png');

export default function BillPaymentScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [landmark, setLandmark] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('bill-payment');

    const handleBook = async () => {
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'bill-payment')
                : [];
            router.push({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        serviceId,
                        cityId,
                        scheduledDate: new Date().toISOString(),
                        addressLine: 'Online / Concierge',
                        formDataJson: { billAttachments: uploadedImageUrls },
                    }),
                    amount: String(servicePrice),
                    label: serviceName || 'Bill Payment',
                },
            });
        } catch {
            Alert.alert('Error', 'Failed to process. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <ServiceDetailScreen
            headerTitle="Bill Payment"
            heroTitle="Bill Payment"
            heroSubtitle="Concierge Services"
            description="Our concierge will handle your utility bill payments — electricity, water, gas, and more."
            heroImage={imgHero}
            pricingLabel={servicePrice > 0 ? `₹${servicePrice} Convenience Fee Per Bill` : 'Fetching price...'}
            pricingNote="*Actual bill amount is paid by you directly."
            bulletItems={[
                'Electricity Bill Payment',
                'Water & Gas Bill',
                'Property Tax',
                'DTH / Internet Recharge',
            ]}
            address=""
            onBook={handleBook}
            isLoading={isLoading || isBooking}
            hideLocation={true}
        >
            <ImageUploadBox
                title="Upload Bill Image (Optional)"
                subtitle="JPG, PNG or PDF, file size no more than 10MB"
                onImagesChange={setSelectedImages}
                maxImages={3}
            />
        </ServiceDetailScreen>
    );
}
