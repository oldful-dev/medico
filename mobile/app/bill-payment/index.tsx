import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { bookingService } from '@/services/api/bookingService';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png');

export default function BillPaymentScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const { cityId, serviceId, isLoading } = useServiceInitialization('bill-payment');

    const handleBook = async () => {
        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);
            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: 'Online / Concierge',
                formDataJson: {},
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch {
            Alert.alert('Error', 'Failed to create booking. Please check your connection.');
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
            pricingLabel="₹49 Convenience Fee Per Bill"
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
                title="Select An Image Of Scrap Items"
                subtitle="JPG, PNG or PDF, file size no more than 10MB"
                onImagesChange={setSelectedImages}
                maxImages={3}
            />
        </ServiceDetailScreen>
    );
}
